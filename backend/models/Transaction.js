import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: "Milestone" },
  type: { type: String, enum: ["funded_demo", "released_demo", "refunded_demo", "held_demo"], required: true },
  amountMinor: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "INR" },
  reference: { type: String, required: true, unique: true },
  note: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model("Transaction", transactionSchema);
