import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["client", "freelancer"], required: true },
  walletAddress: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
  walletChallenge: { type: String, select: false },
  walletChallengeExpiresAt: { type: Date, select: false }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
