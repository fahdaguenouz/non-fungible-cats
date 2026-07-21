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

const connectBtn = document.getElementById('connectBtn');
const nftGrid = document.getElementById('nftGrid');
const toast = document.getElementById('toast');
const listModal = document.getElementById('listModal');
const cancelListBtn = document.getElementById('cancelListBtn');
const confirmListBtn = document.getElementById('confirmListBtn');
const listPriceInput = document.getElementById('listPrice');

// Initialize
async function init() {
    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
        
        // Check if already connected
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
            handleAccountsChanged(accounts);
        }

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());
    } else {
        showToast("Please install MetaMask to use this dApp.", true);
    }
    
    await loadNFTs();
}

async function connectWallet() {
    if (!window.ethereum) return;
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        handleAccountsChanged(accounts);
    } catch (err) {
        console.error(err);
        showToast(err.message, true);
    }
}

async function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        userAddress = null;
        connectBtn.innerText = "Connect Wallet";
    } else {
        userAddress = accounts[0].address || accounts[0]; // depends on ethers version
        signer = await provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
        connectBtn.innerText = userAddress.substring(0,6) + '...' + userAddress.substring(38);
    }
    await loadNFTs(); // reload to update buttons
}

async function loadNFTs() {
    nftGrid.innerHTML = ''; // Clear grid

    let initialPriceEth = "0.00";
    try {
        const initialPriceWei = await contract.getCurrentInitialPrice();
        initialPriceEth = ethers.formatEther(initialPriceWei);
    } catch (e) {
        console.error("Could not fetch initial price. Is contract deployed?", e);
    }

    // We have 3 tokens: 0, 1, 2
    for (let i = 0; i < 3; i++) {
        await renderNFTCard(i, initialPriceEth);
    }
}

async function renderNFTCard(tokenId, initialPriceEth) {
    let owner = null;
    let priceEth = initialPriceEth;
    let isListed = false;

    // Check ownership
    try {
        owner = await contract.ownerOf(tokenId);
    } catch (e) {
        // Token is likely unminted
        owner = null;
    }

    // Fetch Metadata
    let metadata = { name: `Unknown Cat ${tokenId}`, image: "", description: "" };
    try {
        // Our tokenURI returns "0.json" when unminted due to our override
        const uri = await contract.tokenURI(tokenId); 
        const res = await fetch(`${SERVER_URL}/metadata/${uri}`);
        metadata = await res.json();
    } catch (e) {
        console.error(`Failed to fetch metadata for token ${tokenId}`, e);
    }

    // Check if listed on secondary market
    if (owner) {
        try {
            const listing = await contract.listings(tokenId);
            if (listing.isListed) {
                isListed = true;
                priceEth = ethers.formatEther(listing.price);
            } else {
                priceEth = "Not for sale";
            }
        } catch(e) {}
    } else {
        isListed = true; // Initial sale is considered "listed" implicitly
    }

    // Build Card HTML
    const isOwner = owner && userAddress && owner.toLowerCase() === userAddress.toLowerCase();
    
    let actionHtml = '';
    if (isOwner) {
        if (isListed) {
            actionHtml = `<button class="btn-secondary" onclick="delistToken(${tokenId})">Delist</button>`;
        } else {
            actionHtml = `<button class="btn-primary" onclick="openListModal(${tokenId})">List for Sale</button>`;
        }
    } else if (isListed) {
        actionHtml = `<button class="btn-primary" onclick="buyToken(${tokenId}, '${priceEth}')">Buy</button>`;
    } else {
        actionHtml = `<button class="btn-primary" disabled>Not for Sale</button>`;
    }

    const card = document.createElement('div');
    card.className = 'nft-card';
    card.innerHTML = `
        <div class="image-container">
            <img src="${metadata.image}" alt="${metadata.name}">
        </div>
        <div class="nft-info">
            <div>
                <div class="nft-name">${metadata.name}</div>
                <div class="nft-owner">${owner ? (isOwner ? 'Owned by You' : `Owner: ${owner.substring(0,6)}...`) : 'Unminted'}</div>
            </div>
            <div class="price-container">
                <div class="price-label">Price</div>
                <div class="price-value">${priceEth !== "Not for sale" ? priceEth + ' ETH' : '-'}</div>
            </div>
        </div>
        <div class="actions">
            ${actionHtml}
        </div>
    `;
    nftGrid.appendChild(card);
}

// Interactions
async function buyToken(tokenId, priceEth) {
    if (!signer) return showToast("Please connect wallet first", true);
    try {
        showToast("Processing transaction...");
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
cancelListBtn.addEventListener('click', () => listModal.classList.remove('active'));
confirmListBtn.addEventListener('click', confirmList);

// Boot
window.onload = init;
