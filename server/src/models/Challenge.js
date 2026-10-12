const mongoose = require("mongoose");

const QuestionOptionSchema = new mongoose.Schema({
  optionId: { type: String, required: true }, // e.g. "A", "B", "C", "D"
  optionText: { type: String, required: true },
});

const ChallengeQuestionSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  type: { type: String, enum: ["subjective", "mcq"], default: "subjective" },
  options: [QuestionOptionSchema],
  correctOptionId: { type: String, default: "" },
  explanation: { type: String, default: "" },
  topic: { type: String, default: "General" },
  difficulty: { type: Number, default: 2 },
});

const ChallengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ["daily", "weekly", "practice"], required: true },
  periodKey: { type: String, default: "" }, // e.g., "2026-09-30" for daily, "2026-W39" for weekly
  category: { type: String, enum: ["HR", "Technical", "Aptitude", "Domain-Specific", "Mixed"], required: true },
  domain: { type: String, default: "General" },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard", "Mixed"], default: "Medium" },
  questions: [ChallengeQuestionSchema],
  timeLimitMinutes: { type: Number, default: 10 },
  xpReward: { type: Number, default: 100 },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Challenge", ChallengeSchema);
