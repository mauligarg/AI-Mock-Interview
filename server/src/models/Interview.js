const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["ai", "user"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const QuestionSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  topic: { type: String, default: "" },
  difficulty: { type: Number, enum: [1, 2, 3], default: 2 }, // 1: Easy, 2: Medium, 3: Hard
  answer: { type: String, default: "" },
  score: { type: Number, default: 0 },
  classification: {
    type: String,
    enum: ["Exceptional", "Excellent", "Strong", "Good", "Average", "Weak", "Incorrect", "Skipped", "Pending"],
    default: "Pending",
  },
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  skipped: { type: Boolean, default: false },
  repeatedAnswer: { type: Boolean, default: false },
  decisionReason: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },
});

const DifficultyHistorySchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  difficulty: { type: Number, required: true },
  label: { type: String, required: true },
  reason: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },
});

const InterviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  domain: { type: String, required: true },
  score: { type: Number, default: 0 },
  duration: { type: Number, default: 0 }, // minutes
  questionsAnswered: { type: Number, default: 0 },
  messages: [MessageSchema],
  feedback: { type: String, default: "" },
  isComplete: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },

  // Adaptive Engine Fields
  currentDifficulty: { type: Number, enum: [1, 2, 3], default: 2 },
  highestDifficulty: { type: Number, enum: [1, 2, 3], default: 2 },
  difficultyHistory: [DifficultyHistorySchema],
  questions: [QuestionSchema],
  skippedCount: { type: Number, default: 0 },
  consecutiveSkips: { type: Number, default: 0 },
  consecutiveStrong: { type: Number, default: 0 },
  consecutiveWeak: { type: Number, default: 0 },
  repeatedAnswerCount: { type: Number, default: 0 },
  overallScore: { type: Number, default: 0 },
  finalReport: { type: mongoose.Schema.Types.Mixed, default: null },

  // AI Recruiter Simulator Fields
  company: { type: String, default: "General" },
  companyProfileKey: { type: String, default: "general" },
  interviewMode: { type: String, default: "Standard Adaptive" },
  // Idempotency & Lifecycle Status
  initializationKey: { type: String, unique: true, sparse: true, index: true },
  status: {
    type: String,
    enum: ["created", "in_progress", "completed", "abandoned"],
    default: "created",
  },
});

module.exports = mongoose.model("Interview", InterviewSchema);

