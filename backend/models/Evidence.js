import mongoose from "mongoose";

const evidenceSchema = new mongoose.Schema({
  milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: "Milestone", required: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, default: "", maxlength: 5000 },
  fileUrl: { type: String, default: "" },
  fileHash: { type: String, default: "" },
  fileName: { type: String, default: "" },
  storedName: { type: String, default: "", select: false },
  mimeType: { type: String, default: "" },
  fileSize: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("Evidence", evidenceSchema);
