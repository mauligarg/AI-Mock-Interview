const mongoose = require("mongoose");

const UserAnswerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  questionType: { type: String, enum: ["subjective", "mcq"], default: "subjective" },
  userAnswer: { type: String, default: "" },
  selectedOptionId: { type: String, default: "" },
  isCorrect: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  classification: { type: String, default: "Skipped" },
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  feedback: { type: String, default: "" },
  skipped: { type: Boolean, default: false },
});

const ChallengeAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: "Challenge", required: true },
  challengeType: { type: String, enum: ["daily", "weekly", "practice"], required: true },
  category: { type: String, required: true },
  periodKey: { type: String, default: "" },
  answers: [UserAnswerSchema],
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 500 },
  accuracy: { type: Number, default: 0 },
  timeTakenSeconds: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 },
  rankAtCompletion: { type: String, default: "Bronze III" },
  leaderboardPosition: { type: Number, default: 0 },
  rankMovement: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChallengeAttempt", ChallengeAttemptSchema);
