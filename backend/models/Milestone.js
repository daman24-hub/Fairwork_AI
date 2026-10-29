import mongoose from "mongoose";

const milestoneSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  title: { type: String, required: true, trim: true },
  amountMinor: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "INR" },
  deadline: { type: Date },
  acceptanceCriteria: [{ type: String }],
  status: {
    type: String,
    enum: ["pending", "in_progress", "submitted", "approved", "changes_requested", "disputed", "paid"],
    default: "pending"
  },
  escrowStatus: {
    type: String,
    enum: ["not_funded", "funded", "released", "refunded"],
    default: "not_funded"
  },
  blockchainEscrow: {
    chainId: Number,
    contractAddress: String,
    dealId: String,
    transactionHash: String,
    amountWei: String,
    agreementHash: String
  }
}, { timestamps: true });

export default mongoose.model("Milestone", milestoneSchema);
