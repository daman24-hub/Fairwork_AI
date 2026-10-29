// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title FairWorkEscrow
/// @notice Hackathon demo escrow for one milestone per deal. Not audited.
contract FairWorkEscrow {
    enum Status { Funded, Released, Refunded, Disputed }

    struct Deal {
        address payable client;
        address payable freelancer;
        uint256 amount;
        Status status;
        bytes32 agreementHash;
        bytes32 milestoneReference;
        uint64 createdAt;
    }

    uint256 public nextDealId = 1;
    mapping(uint256 => Deal) public deals;
    mapping(bytes32 => bool) public usedMilestoneReferences;

    event DealCreated(
        uint256 indexed dealId,
        address indexed client,
        address indexed freelancer,
        uint256 amount,
        bytes32 agreementHash,
        bytes32 milestoneReference
    );
    event FundsReleased(uint256 indexed dealId, address indexed freelancer, uint256 amount);
    event FundsRefunded(uint256 indexed dealId, address indexed client, uint256 amount);
    event DisputeRaised(uint256 indexed dealId, address indexed raisedBy);
    event DisputeResolved(uint256 indexed dealId, Status outcome);

    modifier dealExists(uint256 dealId) {
        require(dealId > 0 && dealId < nextDealId, "Deal does not exist");
        _;
    }
    modifier onlyClient(uint256 dealId) {
        require(msg.sender == deals[dealId].client, "Only client");
        _;
    }
    modifier onlyParty(uint256 dealId) {
        Deal storage deal = deals[dealId];
        require(msg.sender == deal.client || msg.sender == deal.freelancer, "Not a deal party");
        _;
    }

    /// @notice Client creates a deal and deposits native testnet currency.
    /// @param freelancer Recipient wallet.
    /// @param agreementHash Hash of the final agreement; never store private agreement text on-chain.
    /// @param milestoneReference Unique hash for the app milestone to prevent duplicate deals.
    function createDeal(address payable freelancer, bytes32 agreementHash, bytes32 milestoneReference)
        external payable returns (uint256 dealId)
    {
        require(freelancer != address(0), "Invalid freelancer");
        require(freelancer != msg.sender, "Parties must differ");
        require(msg.value > 0, "Deposit required");
        require(agreementHash != bytes32(0), "Agreement hash required");
        require(milestoneReference != bytes32(0), "Milestone reference required");
        require(!usedMilestoneReferences[milestoneReference], "Milestone already funded");
        usedMilestoneReferences[milestoneReference] = true;

        dealId = nextDealId++;
        deals[dealId] = Deal({
            client: payable(msg.sender),
            freelancer: freelancer,
            amount: msg.value,
            status: Status.Funded,
            agreementHash: agreementHash,
            milestoneReference: milestoneReference,
            createdAt: uint64(block.timestamp)
        });
        emit DealCreated(dealId, msg.sender, freelancer, msg.value, agreementHash, milestoneReference);
    }

    /// @notice Client approves delivery and releases funds to freelancer.
    function release(uint256 dealId) external dealExists(dealId) onlyClient(dealId) {
        Deal storage deal = deals[dealId];
        require(deal.status == Status.Funded, "Deal is not funded");
        deal.status = Status.Released;
        uint256 amount = deal.amount;
        deal.amount = 0;
        (bool ok,) = deal.freelancer.call{value: amount}("");
        require(ok, "Payment failed");
        emit FundsReleased(dealId, deal.freelancer, amount);
    }

    /// @notice Client refunds funds while deal is not disputed.
    function refund(uint256 dealId) external dealExists(dealId) onlyClient(dealId) {
        Deal storage deal = deals[dealId];
        require(deal.status == Status.Funded, "Deal is not funded");
        deal.status = Status.Refunded;
        uint256 amount = deal.amount;
        deal.amount = 0;
        (bool ok,) = deal.client.call{value: amount}("");
        require(ok, "Refund failed");
        emit FundsRefunded(dealId, deal.client, amount);
    }

    /// @notice Either party can pause normal release/refund by raising a dispute.
    function raiseDispute(uint256 dealId) external dealExists(dealId) onlyParty(dealId) {
        Deal storage deal = deals[dealId];
        require(deal.status == Status.Funded, "Deal is not funded");
        deal.status = Status.Disputed;
        emit DisputeRaised(dealId, msg.sender);
    }

    /// @dev Hackathon demonstration only. Either party can select outcome; unsafe for production.
    /// Production needs a mutually agreed arbitrator or carefully designed dispute mechanism.
    function resolveDispute(uint256 dealId, bool payFreelancer)
        external dealExists(dealId) onlyParty(dealId)
    {
        Deal storage deal = deals[dealId];
        require(deal.status == Status.Disputed, "Deal is not disputed");
        uint256 amount = deal.amount;
        deal.amount = 0;

        if (payFreelancer) {
            deal.status = Status.Released;
            (bool paid,) = deal.freelancer.call{value: amount}("");
            require(paid, "Payment failed");
            emit FundsReleased(dealId, deal.freelancer, amount);
            emit DisputeResolved(dealId, Status.Released);
        } else {
            deal.status = Status.Refunded;
            (bool refunded,) = deal.client.call{value: amount}("");
            require(refunded, "Refund failed");
            emit FundsRefunded(dealId, deal.client, amount);
            emit DisputeResolved(dealId, Status.Refunded);
        }
    }

    function getDeal(uint256 dealId) external view dealExists(dealId) returns (Deal memory) {
        return deals[dealId];
    }
}
