import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: "", maxlength: 10000 },
  budgetPaise: {
    type: Number,
    min: 0,
    validate: { validator: (value) => value === null || Number.isSafeInteger(value) },
    default: null
  },
  deadline: { type: Date, default: null },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: {
    type: String,
    enum: ["draft", "awaiting_agreement", "active", "completed", "disputed"],
    default: "draft"
  }
}, { timestamps: true });

export default mongoose.model("Project", projectSchema);
