import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: "Milestone", required: true },
  openedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, required: true, maxlength: 5000 },
  evidenceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Evidence" }],
  aiSummary: { type: String, default: "" },
  status: { type: String, enum: ["open", "under_review", "resolved", "closed"], default: "open" },
  resolutionNotes: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model("Dispute", disputeSchema);
