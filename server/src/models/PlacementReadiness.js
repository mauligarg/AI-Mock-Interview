const mongoose = require("mongoose");

const ReadinessHistorySchema = new mongoose.Schema({
  score: { type: Number, required: true },
  classification: { type: String, required: true },
  componentScores: {
    interviewPerformance: { type: Number, default: 0 },
    resumeStrength: { type: Number, default: 0 },
    skillMatch: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
  },
  weakAreas: [{ type: String }],
  missingSkills: [{ type: String }],
  generatedAt: { type: Date, default: Date.now },
});

const PlacementReadinessSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  currentScore: { type: Number, default: 0 },
  classification: {
    type: String,
    enum: ["Needs Improvement", "High Potential Candidate", "Placement Ready"],
    default: "Needs Improvement",
  },
  candidateType: {
    type: String,
    enum: ["Fresher", "Internship Seeker", "Experienced Candidate"],
    default: "Fresher",
  },
  targetDomain: { type: String, default: "General" },

  components: {
    interviewPerformance: { type: Number, default: 0 },
    resumeStrength: { type: Number, default: 0 },
    skillMatch: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
  },

  strongAreas: [{ type: String }],
  weakAreas: [{ type: String }],
  missingSkills: [{ type: String }],
  communicationGaps: [{ type: String }],

  roadmap: [
    {
      phase: { type: String },
      duration: { type: String },
      tasks: [{ type: String }],
    },
  ],

  recommendedTechnologies: [{ type: String }],
  recommendedProjects: [
    {
      title: { type: String },
      skills: [{ type: String }],
      description: { type: String },
      why: { type: String },
    },
  ],
  recommendedCertifications: [
    {
      title: { type: String },
      provider: { type: String },
      isOptional: { type: Boolean, default: true },
    },
  ],
  interviewTopics: [
    {
      topic: { type: String },
      priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
    },
  ],

  history: [ReadinessHistorySchema],
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PlacementReadiness", PlacementReadinessSchema);
