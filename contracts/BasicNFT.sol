// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract BasicNFT is ERC721URIStorage {
    constructor(string memory name) ERC721(name, name) {}

    // ERC721 already implements ownerOf and tokenURI.
    // However, the instructions specifically ask for a transfer(uint256 tokenId, address to) function.
    function transfer(uint256 tokenId, address to) public {
        address owner = ownerOf(tokenId);

        require(
            msg.sender == owner ||
                getApproved(tokenId) == msg.sender ||
                isApprovedForAll(owner, msg.sender),
            "Not owner nor approved"
        );

        _transfer(owner, to, tokenId);
    }
}
