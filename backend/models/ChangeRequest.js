import mongoose from "mongoose";

const changeRequestSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true, maxlength: 5000 },
  proposedAmountMinor: { type: Number, min: 0 },
  proposedDeadline: { type: Date },
  status: { type: String, enum: ["pending", "accepted", "rejected", "withdrawn"], default: "pending" }
}, { timestamps: true });

export default mongoose.model("ChangeRequest", changeRequestSchema);
