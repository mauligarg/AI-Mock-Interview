const mongoose = require("mongoose");

const RankHistorySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  periodLabel: { type: String, default: "" },
  xp: { type: Number, default: 0 },
  rank: { type: String, default: "Bronze III" },
  leaderboardPosition: { type: Number, default: 0 },
  percentile: { type: Number, default: 0 },
});

const BadgeSchema = new mongoose.Schema({
  badgeId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  unlockedAt: { type: Date, default: Date.now },
});

const CategoryStatsSchema = new mongoose.Schema({
  completedCount: { type: Number, default: 0 },
  totalScoreSum: { type: Number, default: 0 },
  bestScore: { type: Number, default: 0 },
});

const GamificationProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  displayName: { type: String, default: "" },
  isDemo: { type: Boolean, default: false },
  totalXP: { type: Number, default: 0 },
  currentRank: { type: String, default: "Bronze III" },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActiveDateStr: { type: String, default: "" },
  badges: [BadgeSchema],
  categoryStats: {
    HR: { type: CategoryStatsSchema, default: () => ({ completedCount: 0, totalScoreSum: 0, bestScore: 0 }) },
    Technical: { type: CategoryStatsSchema, default: () => ({ completedCount: 0, totalScoreSum: 0, bestScore: 0 }) },
    Aptitude: { type: CategoryStatsSchema, default: () => ({ completedCount: 0, totalScoreSum: 0, bestScore: 0 }) },
    "Domain-Specific": { type: CategoryStatsSchema, default: () => ({ completedCount: 0, totalScoreSum: 0, bestScore: 0 }) },
  },
  totalChallengesCompleted: { type: Number, default: 0 },
  dailyCompletedCount: { type: Number, default: 0 },
  weeklyCompletedCount: { type: Number, default: 0 },
  bestScore: { type: Number, default: 0 },
  rankHistory: [RankHistorySchema],
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("GamificationProfile", GamificationProfileSchema);
