import mongoose from "mongoose";

const agreementSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  version: { type: Number, required: true, min: 1 },
  terms: { type: String, required: true },
  acceptanceCriteria: [{ type: String }],
  contentHash: { type: String },
  clientApprovedAt: { type: Date, default: null },
  freelancerApprovedAt: { type: Date, default: null },
  status: { type: String, enum: ["draft", "pending_approval", "approved", "superseded"], default: "draft" }
}, { timestamps: true });

agreementSchema.index({ projectId: 1, version: 1 }, { unique: true });
export default mongoose.model("Agreement", agreementSchema);
