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
  }
}, { timestamps: true });

export default mongoose.model("Milestone", milestoneSchema);
