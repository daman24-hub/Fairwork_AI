import mongoose from "mongoose";

const projectInvitationSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  inviterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  inviteeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  invitedRole: { type: String, enum: ["client", "freelancer"], required: true },
  status: { type: String, enum: ["pending", "accepted", "declined", "cancelled"], default: "pending" },
  respondedAt: { type: Date, default: null }
}, { timestamps: true });

projectInvitationSchema.index(
  { projectId: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);
projectInvitationSchema.index({ inviteeId: 1, status: 1, createdAt: -1 });

export default mongoose.model("ProjectInvitation", projectInvitationSchema);
