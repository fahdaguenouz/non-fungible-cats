const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Default hardhat local address for first deploy
const SERVER_URL = "http://localhost:3030";

const ABI = [
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function listToken(uint256 tokenId, uint256 price)",
    "function delistToken(uint256 tokenId)",
    "function buyToken(uint256 tokenId) payable",
    "function getCurrentInitialPrice() view returns (uint256)",
    "function listings(uint256 tokenId) view returns (uint256 price, bool isListed)"
];

let provider;
let signer;
let contract;
let userAddress = null;
let currentTokenToList = null;
let currentLoadId = 0;

const connectBtn = document.getElementById('connectBtn');
const nftGrid = document.getElementById('nftGrid');
const toast = document.getElementById('toast');
const listModal = document.getElementById('listModal');
const cancelListBtn = document.getElementById('cancelListBtn');
const confirmListBtn = document.getElementById('confirmListBtn');
const listPriceInput = document.getElementById('listPrice');
const disconnectBtn = document.getElementById('disconnectBtn');

// Initialize
async function init() {
    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
        
        // Check if already connected
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
            await handleAccountsChanged(accounts);
        } else {
            await loadNFTs();
        }

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());
    } else {
        showToast("Please install MetaMask to use this dApp.", true);
        await loadNFTs();
    }
}

async function connectWallet() {
    if (!window.ethereum) return;
    try {
        // Request permissions to force MetaMask to show the account picker
        await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
        });
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        await handleAccountsChanged(accounts);
    } catch (err) {
        console.error(err);
        showToast(err.message, true);
    }
}

async function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        userAddress = null;
        connectBtn.innerText = "Connect Wallet";
        disconnectBtn.style.display = "none";
    } else {
        userAddress = accounts[0].address || accounts[0]; // depends on ethers version
        signer = await provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
        connectBtn.innerText = userAddress.substring(0,6) + '...' + userAddress.substring(38);
        disconnectBtn.style.display = "block";
    }
    await loadNFTs(); // reload to update buttons
}

async function disconnectWallet() {
    userAddress = null;
    signer = null;
    if (provider) {
        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    }
    connectBtn.innerText = "Connect Wallet";
    disconnectBtn.style.display = "none";
    showToast("Logged out successfully");
    await loadNFTs();
}

async function loadNFTs() {
    const loadId = ++currentLoadId;

    let initialPriceEth = "0.00";
    try {
        const initialPriceWei = await contract.getCurrentInitialPrice();
        initialPriceEth = ethers.formatEther(initialPriceWei);
    } catch (e) {
        console.error("Could not fetch initial price. Is contract deployed?", e);
    }

    if (loadId !== currentLoadId) return;

    // We have 3 tokens: 0, 1, 2
    const cards = [];
    for (let i = 0; i < 3; i++) {
        const card = await renderNFTCard(i, initialPriceEth);
        if (loadId !== currentLoadId) return;
        if (card) {
            cards.push(card);
        }
    }

    nftGrid.innerHTML = ''; // Clear grid
    cards.forEach(card => nftGrid.appendChild(card));
}

async function renderNFTCard(tokenId, initialPriceEth) {
    let owner = null;
    let metadata = {
        name: `Napping Cat #${tokenId}`,
        description: "",
        image: ""
    };

    let isListed = false;
    let priceEth = initialPriceEth;

    // -------------------------
    // Owner
    // -------------------------
    try {
        owner = await contract.ownerOf(tokenId);
    } catch {
        owner = null; // Token not minted
    }

    // -------------------------
    // Metadata
    // -------------------------
    try {
        const uri = await contract.tokenURI(tokenId);

        const metadataUrl = uri.startsWith("http")
            ? uri
            : `${SERVER_URL}/metadata/${uri}`;

        const response = await fetch(metadataUrl);

        if (!response.ok) {
            throw new Error("Metadata not found");
        }

        metadata = await response.json();

        // Add cache-busting to image URL so the browser re-fetches after purchase
        if (metadata.image) {
            const sep = metadata.image.includes('?') ? '&' : '?';
            metadata.image = metadata.image + sep + 't=' + Date.now();
        }
    } catch (err) {
        console.error(`Metadata error for token ${tokenId}:`, err);
    }

    // -------------------------
    // Listing
    // -------------------------
    if (owner) {
        try {
            const listing = await contract.listings(tokenId);

            if (listing.isListed) {
                isListed = true;
                priceEth = ethers.formatEther(listing.price);
            } else {
                priceEth = null;
            }
        } catch (err) {
            console.error(err);
            priceEth = null;
        }
    } else {
        // Initial sale
        isListed = true;
    }

    // -------------------------
    // Ownership
    // -------------------------
    const isOwner =
        owner &&
        userAddress &&
        owner.toLowerCase() === userAddress.toLowerCase();

    // -------------------------
    // Buttons
    // -------------------------
    let actionHtml = "";

    if (isOwner) {
        actionHtml = isListed
            ? `<button class="btn-secondary" onclick="delistToken(${tokenId})">
                    Delist
               </button>`
            : `<button class="btn-primary" onclick="openListModal(${tokenId})">
                    List for Sale
               </button>`;
    } else if (!owner) {
        // Token is unminted — initial sale
        actionHtml = `
            <button
                class="btn-primary"
                onclick="buyToken(${tokenId}, '${priceEth}')">
                Buy
            </button>`;
    } else if (isListed) {
        // Token is owned by someone else AND listed for sale
        actionHtml = `
            <button
                class="btn-primary"
                onclick="buyToken(${tokenId}, '${priceEth}')">
                Buy
            </button>`;
    } else {
        // Token is owned by someone else but NOT listed
        actionHtml = `
            <button class="btn-primary" disabled>
                Not for Sale
            </button>`;
    }

    // -------------------------
    // Owner Text
    // -------------------------
    let ownerText = "Unminted";

    if (owner) {
        ownerText = isOwner
            ? "Owned by You"
            : `Owner: ${owner.slice(0, 6)}...${owner.slice(-4)}`;
    }

    // -------------------------
    // Price Text
    // -------------------------
    const priceText = priceEth
        ? `${priceEth} ETH`
        : "-";

    // -------------------------
    // Card
    // -------------------------
    const card = document.createElement("div");
    card.className = "nft-card";

    card.innerHTML = `
        <div class="image-container">
            <img
                src="${metadata.image}"
                alt="${metadata.name}"
                loading="lazy"
                onerror="
                    this.onerror=null;
                    this.src='data:image/svg+xml;utf8,
                    <svg xmlns=\\'http://www.w3.org/2000/svg\\'
                    width=\\'200\\'
                    height=\\'200\\'>
                    <rect width=\\'200\\'
                    height=\\'200\\'
                    fill=\\'%23333\\'/>
                    <text
                    x=\\'50%\\'
                    y=\\'50%\\'
                    dominant-baseline=\\'middle\\'
                    text-anchor=\\'middle\\'
                    fill=\\'white\\'
                    font-size=\\'16\\'>
                    Mystery Cat
                    </text>
                    </svg>';
                ">
        </div>

        <div class="nft-info">
            <div>
                <div class="nft-name">${metadata.name}</div>
                <div class="nft-owner">${ownerText}</div>
            </div>

            <div class="price-container">
                <div class="price-label">Price</div>
                <div class="price-value">${priceText}</div>
            </div>
        </div>

        <div class="actions">
            ${actionHtml}
        </div>
    `;

    return card;
}
// Interactions
async function buyToken(tokenId, priceEth) {
    if (!signer) return showToast("Please connect wallet first", true);
    try {
        showToast("Processing transaction...");
        if (priceEth === "Not for sale") return;
        const tx = await contract.buyToken(tokenId, { value: ethers.parseEther(priceEth) });
        await tx.wait();
        showToast("Purchase successful!");
        await loadNFTs();
    } catch (err) {
        console.error(err);
        showToast(err.reason || err.message, true);
    }
}

function openListModal(tokenId) {
    currentTokenToList = tokenId;
    listPriceInput.value = '';
    listModal.classList.add('active');
}

async function confirmList() {
    if (currentTokenToList === null || !signer) return;
    const priceEth = listPriceInput.value;
    if (!priceEth || parseFloat(priceEth) <= 0) return showToast("Invalid price", true);

    try {
        listModal.classList.remove('active');
        showToast("Listing token...");
        if (priceEth === "Not for sale") return;
        const tx = await contract.listToken(currentTokenToList, ethers.parseEther(priceEth));
        await tx.wait();
        showToast("Token listed successfully!");
        await loadNFTs();
    } catch (err) {
        console.error(err);
        showToast(err.reason || err.message, true);
    }
}

async function delistToken(tokenId) {
    if (!signer) return;
    try {
        showToast("Delisting token...");
        const tx = await contract.delistToken(tokenId);
        await tx.wait();
        showToast("Token delisted successfully!");
        await loadNFTs();
    } catch (err) {
        console.error(err);
        showToast(err.reason || err.message, true);
    }
}

// Utilities
function showToast(msg, isError = false) {
    toast.innerText = msg;
    toast.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(() => {
        toast.className = 'toast' + (isError ? ' error' : '');
    }, 3000);
}

// Event Listeners
connectBtn.addEventListener('click', connectWallet);
disconnectBtn.addEventListener('click', disconnectWallet);
cancelListBtn.addEventListener('click', () => listModal.classList.remove('active'));
confirmListBtn.addEventListener('click', confirmList);

// Boot
window.onload = init;
