// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract BasicNFT is ERC721URIStorage {
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    // ERC721 already implements ownerOf and tokenURI.
    // However, the instructions specifically ask for a transfer(uint256 tokenId, address to) function.
    function transfer(uint256 tokenId, address to) public {
        // Ensure the caller is the owner or approved
        require(ownerOf(tokenId) == msg.sender || getApproved(tokenId) == msg.sender || isApprovedForAll(ownerOf(tokenId), msg.sender), "BasicNFT: caller is not token owner or approved");
        _transfer(ownerOf(tokenId), to, tokenId);
    }
}
