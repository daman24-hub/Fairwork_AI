import {
  Contract,
  Interface,
  JsonRpcProvider,
  getAddress,
  isAddress,
  keccak256,
  toUtf8Bytes
} from "ethers";
import mongoose from "mongoose";
import Agreement from "../models/Agreement.js";
import Milestone from "../models/Milestone.js";
import Project from "../models/Project.js";
import User from "../models/User.js";

const sepoliaChainId = 11155111;
const escrowInterface = new Interface([
  "event DealCreated(uint256 indexed dealId, address indexed client, address indexed freelancer, uint256 amount, bytes32 agreementHash, bytes32 milestoneReference)",
  "function getDeal(uint256 dealId) view returns (tuple(address client, address freelancer, uint256 amount, uint8 status, bytes32 agreementHash, bytes32 milestoneReference, uint64 createdAt))"
]);

function isValidHash(value) {
  return typeof value === "string" && /^0x[0-9a-f]{64}$/i.test(value);
}

function calculateAgreementHash(agreement) {
  return keccak256(toUtf8Bytes(JSON.stringify({
    version: agreement.version,
    terms: agreement.terms,
    acceptanceCriteria: agreement.acceptanceCriteria
  })));
}

export async function recordSepoliaDeal(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.projectId) ||
        !mongoose.isValidObjectId(req.params.milestoneId)) {
      return res.status(404).json({ success: false, message: "Project or milestone not found." });
    }
    if (req.user.role !== "client") {
      return res.status(403).json({ success: false, message: "Only the project client can create an on-chain escrow deal." });
    }
    if (!process.env.SEPOLIA_RPC_URL || !process.env.SEPOLIA_ESCROW_ADDRESS ||
        !isAddress(process.env.SEPOLIA_ESCROW_ADDRESS)) {
      return res.status(503).json({ success: false, message: "Sepolia escrow verification is not configured on the backend." });
    }

    const project = await Project.findOne({
      _id: req.params.projectId,
      clientId: req.user._id,
      freelancerId: { $exists: true, $ne: null }
    });
    if (!project || project.status !== "active") {
      return res.status(404).json({ success: false, message: "Active project with both participants not found." });
    }
    if (!req.user.walletAddress) {
      return res.status(409).json({ success: false, message: "Link your client wallet before recording an on-chain deal." });
    }

    const [agreement, milestone, freelancer] = await Promise.all([
      Agreement.findOne({ projectId: project._id, status: "approved" }).sort({ version: -1 }),
      Milestone.findOne({ _id: req.params.milestoneId, projectId: project._id }),
      User.findById(project.freelancerId).select("walletAddress")
    ]);
    if (!agreement || !milestone) {
      return res.status(404).json({ success: false, message: "Approved agreement or milestone not found." });
    }
    if (!freelancer?.walletAddress) {
      return res.status(409).json({ success: false, message: "The freelancer must link a wallet before funding this milestone." });
    }
    if (!["pending", "in_progress"].includes(milestone.status) || milestone.blockchainEscrow?.dealId) {
      return res.status(409).json({ success: false, message: "This milestone cannot receive another blockchain escrow deal." });
    }

    const { dealId, transactionHash } = req.body;
    if (typeof dealId !== "string" || !/^[1-9]\d*$/.test(dealId) ||
        !isValidHash(transactionHash)) {
      return res.status(400).json({ success: false, message: "A valid on-chain deal ID and transaction hash are required." });
    }

    const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const network = await provider.getNetwork();
    if (network.chainId !== BigInt(sepoliaChainId)) {
      return res.status(503).json({ success: false, message: "The configured RPC endpoint is not Sepolia." });
    }

    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (!receipt || receipt.status !== 1 || !receipt.to ||
        getAddress(receipt.to) !== getAddress(process.env.SEPOLIA_ESCROW_ADDRESS) ||
        getAddress(receipt.from) !== getAddress(req.user.walletAddress)) {
      return res.status(400).json({ success: false, message: "The transaction is not a successful deal creation from your linked client wallet." });
    }

    let createdDeal;
    for (const log of receipt.logs) {
      if (getAddress(log.address) !== getAddress(process.env.SEPOLIA_ESCROW_ADDRESS)) continue;
      try {
        const parsed = escrowInterface.parseLog(log);
        if (parsed?.name === "DealCreated") {
          createdDeal = parsed.args;
          break;
        }
      } catch {
        continue;
      }
    }
    if (!createdDeal ||
        createdDeal.dealId.toString() !== dealId ||
        getAddress(createdDeal.client) !== getAddress(req.user.walletAddress) ||
        getAddress(createdDeal.freelancer) !== getAddress(freelancer.walletAddress) ||
        createdDeal.agreementHash !== calculateAgreementHash(agreement) ||
        createdDeal.milestoneReference !== keccak256(toUtf8Bytes(milestone._id.toString()))) {
      return res.status(400).json({ success: false, message: "The on-chain deal does not match this project's linked participants." });
    }

    const contract = new Contract(process.env.SEPOLIA_ESCROW_ADDRESS, escrowInterface, provider);
    const deal = await contract.getDeal(dealId);
    if (deal.status !== 0n || deal.amount <= 0n) {
      return res.status(400).json({ success: false, message: "The on-chain deal is not in the funded state." });
    }

    milestone.blockchainEscrow = {
      chainId: sepoliaChainId,
      contractAddress: getAddress(process.env.SEPOLIA_ESCROW_ADDRESS),
      dealId,
      transactionHash,
      amountWei: deal.amount.toString(),
      agreementHash: deal.agreementHash
    };
    await milestone.save();
    return res.status(201).json({ success: true, blockchainEscrow: milestone.blockchainEscrow });
  } catch (error) {
    return next(error);
  }
}

export async function getSepoliaEscrowConfiguration(req, res) {
  if (!process.env.SEPOLIA_RPC_URL || !process.env.SEPOLIA_ESCROW_ADDRESS ||
      !isAddress(process.env.SEPOLIA_ESCROW_ADDRESS)) {
    return res.status(503).json({ success: false, message: "Sepolia escrow contract and RPC are not configured." });
  }
  return res.json({
    success: true,
    chainId: sepoliaChainId,
    contractAddress: getAddress(process.env.SEPOLIA_ESCROW_ADDRESS)
  });
}
