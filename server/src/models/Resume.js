const mongoose = require("mongoose");

const ResumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  resumeText: { type: String, default: "" },
  summary: { type: String, default: "" },
  experienceLevel: { type: String, enum: ["Junior", "Mid", "Senior"], default: "Junior" },
  skillsDetected: [{ type: String }],
  strengths: [{ type: String }],
  recommendedDomains: [
    {
      label: { type: String },
      reason: { type: String },
      confidence: { type: Number },
    }
  ],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Resume", ResumeSchema);
