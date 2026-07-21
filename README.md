# Non Fungible Cats

Welcome to **Non Fungible Cats**, an interactive Web3 decentralized application (dApp) where users can mint, buy, sell, and collect unique cat-themed NFTs on a local blockchain. 

This project explores the core concepts of Non Fungible Tokens using the ERC-721 standard, integrating a custom smart contract, a Node.js backend for dynamic metadata and "Automated Reveal" mechanics, and a vanilla JavaScript frontend.

## Features

- **ERC-721 Smart Contract**: Implements core NFT features using OpenZeppelin standards.
- **Dynamic Pricing (Auction Mechanics)**: The initial mint price starts at 100x the base price and decreases over 24 hours.
- **Secondary Marketplace**: Users can list their cats for sale and other users can purchase them.
- **Automated Reveal System**: The backend server keeps the cat images hidden (returning a mystery box) until the token is officially purchased and owned.
- **Wallet Integration**: Connect with MetaMask to interact with the blockchain.

---

## Prerequisites

Before running the project, make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/)
- [MetaMask Extension](https://metamask.io/) in your web browser

## Installation & Setup

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository_url>
   cd non-fungible-cats
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

---

## How to Run the Project

To run this project locally, you will need to open **three separate terminals** to run the blockchain, the backend server, and the frontend web app.

### Step 1: Start the Local Blockchain
In your first terminal, start the Hardhat local node. This will simulate a local Ethereum network on your machine and provide you with test accounts loaded with fake ETH.
```bash
npx hardhat node
```
*(Leave this terminal open and running)*

### Step 2: Deploy the Smart Contract
In a **second terminal**, deploy the `NappingCats` smart contract to your local network:
```bash
npx hardhat run scripts/deploy.js --network localhost
```
Note the **deployed contract address** outputted in your console (e.g., `0xe7f1...`). If this is your first time deploying on a fresh node, the address is typically updated in your frontend and backend automatically.

### Step 3: Start the Backend Server (Automated Reveal)
In the same **second terminal** (or a new one), start the Node.js server. This server handles serving the metadata and implements the dynamic image reveal mechanics.
```bash
node server/index.js
```
*Note: If your deployed contract address is different from the default, you can pass it as an argument: `node server/index.js <YOUR_ADDRESS>`*
*(Leave this terminal open and running)*

### Step 4: Serve the Frontend
In a **third terminal**, serve the frontend directory using a local web server so you can interact with the app in your browser:
```bash
npx serve frontend
```

---

## Interacting with the dApp

1. Open your browser and go to `http://localhost:3000`.
2. **Configure MetaMask for Localhost**:
   - Open MetaMask and click the network dropdown at the top.
   - Select **"Add Network"** -> **"Add a network manually"**.
   - Network Name: `Hardhat Localhost`
   - New RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`
3. **Import a Test Account**:
   - Copy one of the Private Keys generated in **Step 1** (from the terminal running `npx hardhat node`).
   - In MetaMask, click on your account avatar -> **"Import Account"**.
   - Paste the Private Key. This gives you test ETH to buy the cats.
4. **Connect and Play**:
   - Click the **"Connect Wallet"** button on the web page.
   - You will see "Mystery Cats" (images are hidden because they haven't been bought yet!).
   - Click **"Buy"** to mint a cat. Accept the transaction in MetaMask.
   - Once the transaction confirms, the page will reload and the actual cat image will be **revealed**! 
   - You can now list your cat for sale on the secondary market by clicking **"List for Sale"**.

---

## Project Structure

- `contracts/` - Solidity smart contracts (`NappingCats.sol`, `BasicNFT.sol`).
- `scripts/` - Deployment script (`deploy.js`).
- `frontend/` - Vanilla JS frontend web app (`index.html`, `app.js`, `index.css`).
- `server/` - Node.js Express server acting as a metadata provider and handling automated reveal logic.

## License

ISC
