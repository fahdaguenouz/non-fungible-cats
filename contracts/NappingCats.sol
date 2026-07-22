// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BasicNFT.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NappingCats is BasicNFT {
    using Strings for uint256;

    uint256 public initialBasePrice;
    uint256 public auctionStartTime;
    uint256 public constant AUCTION_DURATION = 24 hours;
    uint256 public constant AUCTION_MULTIPLIER = 100;

    struct Listing {
        uint256 price;
        bool isListed;
    }

    mapping(uint256 => Listing) public listings;

    // Store URIs for the initial cats so they exist conceptually
    mapping(uint256 => string) private _initialURIs;

    constructor(uint256 _initialBasePrice) BasicNFT("Napping Cats") {
        initialBasePrice = _initialBasePrice;
        auctionStartTime = block.timestamp;

        // Instantiate the first three cats with metadata
        _initialURIs[0] = "0.json";
        _initialURIs[1] = "1.json";
        _initialURIs[2] = "2.json";
    }

    // Function to get current price for initial sale (Auction Mechanics)
    function getCurrentInitialPrice() public view returns (uint256) {
        uint256 timeElapsed = block.timestamp - auctionStartTime;
        if (timeElapsed >= AUCTION_DURATION) {
            return initialBasePrice;
        } else {
            uint256 startPrice = initialBasePrice * AUCTION_MULTIPLIER;
            uint256 priceDecrease = ((startPrice - initialBasePrice) *
                timeElapsed) / AUCTION_DURATION;
            return startPrice - priceDecrease;
        }
    }

    // List a token for sale on the secondary market
    function listToken(uint256 tokenId, uint256 price) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than zero");
        listings[tokenId] = Listing(price, true);
    }

    // Delist a token
    function delistToken(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        listings[tokenId] = Listing(0, false);
    }

    // Buy a token
    function buyToken(uint256 tokenId) public payable {
        address owner = _ownerOf(tokenId); // internal openzeppelin check that returns address(0) if not minted

        if (owner == address(0)) {
            // Token is unminted, this is an initial sale
            require(tokenId < 3, "Invalid token");
            uint256 price = getCurrentInitialPrice();
            require(msg.value >= price, "Insufficient funds for initial sale");

            _mint(msg.sender, tokenId);
            _setTokenURI(tokenId, _initialURIs[tokenId]);

            // Refund excess
            if (msg.value > price) {
                payable(msg.sender).transfer(msg.value - price);
            }
        } else {
            // Secondary market purchase
            Listing memory listing = listings[tokenId];
            require(listing.isListed, "Token is not listed for sale");
            require(
                msg.value >= listing.price,
                "Insufficient funds for secondary purchase"
            );
            require(owner != msg.sender, "Cannot buy your own token");

            // Transfer funds to owner
            (bool success, ) = payable(owner).call{value: listing.price}("");
            require(success);

            // Refund excess to buyer
            if (msg.value > listing.price) {
                uint256 refund = msg.value - listing.price;
                (bool refundSuccess, ) = payable(msg.sender).call{
                    value: refund
                }("");

                require(refundSuccess);
            }

            // Transfer token and remove listing
            _transfer(owner, msg.sender, tokenId);
            delete listings[tokenId];
        }
    }

    // Override tokenURI to return initial URI if not minted yet, to satisfy frontend display
    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) {
            require(
                bytes(_initialURIs[tokenId]).length > 0,
                "URI query for nonexistent token"
            );
            return _initialURIs[tokenId];
        }
        return super.tokenURI(tokenId);
    }
}
