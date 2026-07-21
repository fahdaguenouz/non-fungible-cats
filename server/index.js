import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// We need the smart contract address passed as a parameter
const CONTRACT_ADDRESS = process.argv[2] || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const RPC_URL = "http://127.0.0.1:8545";

const ABI = [
    "function ownerOf(uint256 tokenId) view returns (address)",
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

// Monitor the smart contract for new owners (IPFS integration mock)
contract.on("Transfer", async (from, to, tokenId) => {
    if (from === ethers.ZeroAddress) {
        console.log(`[IPFS Integration Mock] Token ${tokenId} minted to ${to}.`);
        console.log(`[IPFS Integration Mock] Reading metadata and publishing image to IPFS...`);
        // Mock IPFS publish
        const metadataPath = path.join(__dirname, 'metadata', `${tokenId}.json`);
        if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            console.log(`[IPFS Integration Mock] Successfully published to IPFS Hash: ${metadata.future_ipfs_hash}`);
        }
    }
});

// Serve metadata JSON
app.get('/metadata/:id.json', (req, res) => {
    const id = req.params.id;
    const filePath = path.join(__dirname, 'metadata', `${id}.json`);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Metadata not found');
    }
});

// Automated Reveal: Serve image ONLY if token has an owner
app.get('/metadata/:id.jpg', async (req, res) => {
    const id = req.params.id;
    const filePath = path.join(__dirname, 'metadata', `${id}.jpg`);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Image not found');
    }

    try {
        // This will throw if the token doesn't have an owner (is not minted)
        const owner = await contract.ownerOf(id);
        if (owner && owner !== ethers.ZeroAddress) {
            // Token has an owner, reveal image
            return res.sendFile(filePath);
        }
    } catch (e) {
        // Token is unminted or doesn't exist
        console.log(`Access denied for ${id}.jpg: Token unminted or no owner.`);
        return res.status(403).send('Image hidden. Purchase the token to reveal.');
    }
});

const PORT = 3030;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Monitoring NappingCats at ${CONTRACT_ADDRESS}`);
});
