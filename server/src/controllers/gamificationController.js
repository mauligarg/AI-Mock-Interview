const GamificationProfile = require("../models/GamificationProfile");
const ChallengeAttempt = require("../models/ChallengeAttempt");
const User = require("../models/User");
const { ALL_BADGES } = require("../config/gamificationConfig");

// ── 1. Get Leaderboard (Daily, Weekly, All-Time) ──────────────
const getLeaderboard = async (req, res) => {
  try {
    const { period = "alltime", includeDemo = "false" } = req.query;

    const baseFilter = {};
    if (includeDemo !== "true") {
      baseFilter.isDemo = { $ne: true };
    }

    let profiles = [];
    if (period === "daily") {
      // Sort by Daily Completed Count and total XP
      profiles = await GamificationProfile.find(baseFilter)
        .sort({ dailyCompletedCount: -1, totalXP: -1 })
        .limit(50);
    } else if (period === "weekly") {
      // Sort by Weekly Completed Count and total XP
      profiles = await GamificationProfile.find(baseFilter)
        .sort({ weeklyCompletedCount: -1, totalXP: -1 })
        .limit(50);
    } else {
      // All-Time XP sorting
      profiles = await GamificationProfile.find(baseFilter)
        .sort({ totalXP: -1 })
        .limit(50);
    }

    const totalParticipants = await GamificationProfile.countDocuments(baseFilter);

    // Map to public representation (NO email or sensitive data)
    const leaderboard = profiles.map((p, idx) => ({
      rankPosition: idx + 1,
      userId: p.userId,
      displayName: p.displayName || "Competitor",
      totalXP: p.totalXP,
      rank: p.currentRank,
      streak: p.currentStreak,
      completedChallenges: p.totalChallengesCompleted,
      badgeCount: p.badges ? p.badges.length : 0,
      isCurrentUser: p.userId.toString() === req.userId.toString(),
    }));

    const userIndex = leaderboard.findIndex((item) => item.isCurrentUser);
    let currentUserPosition = userIndex !== -1 ? userIndex + 1 : null;

    if (!currentUserPosition) {
      // Find actual user position if outside top 50
      const allSorted = await GamificationProfile.find({}).sort({ totalXP: -1 });
      const globalIdx = allSorted.findIndex((p) => p.userId.toString() === req.userId.toString());
      currentUserPosition = globalIdx !== -1 ? globalIdx + 1 : totalParticipants;
    }

    res.json({
      period,
      totalParticipants,
      currentUserPosition,
      leaderboard,
    });
  } catch (err) {
    console.error("getLeaderboard error:", err);
    res.status(500).json({ message: "Failed to fetch leaderboard", error: err.message });
  }
};

// ── 2. Get Gamification Profile ──────────────────────────────
const getGamificationProfile = async (req, res) => {
  try {
    let profile = await GamificationProfile.findOne({ userId: req.userId });
    if (!profile) {
      const user = await User.findById(req.userId);
      profile = await GamificationProfile.create({
        userId: req.userId,
        displayName: user ? user.name : "Competitor",
      });
    }

    // Combine unlocked badges with locked badges definitions
    const unlockedMap = new Map(profile.badges.map((b) => [b.badgeId, b.unlockedAt]));
    const badgesOverview = ALL_BADGES.map((b) => ({
      ...b,
      unlocked: unlockedMap.has(b.badgeId),
      unlockedAt: unlockedMap.get(b.badgeId) || null,
    }));

    // Calculate Peer Comparison Percentile
    const totalParticipants = await GamificationProfile.countDocuments({});
    const higherCount = await GamificationProfile.countDocuments({ totalXP: { $gt: profile.totalXP } });
    const userRankPosition = higherCount + 1;
    const percentile = Math.min(99, Math.max(1, Math.round(((totalParticipants - userRankPosition + 1) / totalParticipants) * 100)));

    // Calculate Best Category
    let bestCategory = "Technical";
    let maxAvg = -1;
    if (profile.categoryStats) {
      for (const [cat, stats] of Object.entries(profile.categoryStats)) {
        if (stats.completedCount > 0) {
          const avg = stats.totalScoreSum / stats.completedCount;
          if (avg > maxAvg) {
            maxAvg = avg;
            bestCategory = cat;
          }
        }
      }
    }

    res.json({
      profile: {
        userId: profile.userId,
        displayName: profile.displayName,
        totalXP: profile.totalXP,
        currentRank: profile.currentRank,
        currentStreak: profile.currentStreak,
        longestStreak: profile.longestStreak,
        totalCompleted: profile.totalChallengesCompleted,
        bestScore: profile.bestScore,
        bestCategory,
        leaderboardPosition: userRankPosition,
        totalParticipants,
        percentile,
      },
      badges: badgesOverview,
      categoryStats: profile.categoryStats,
      rankHistory: profile.rankHistory,
    });
  } catch (err) {
    console.error("getGamificationProfile error:", err);
    res.status(500).json({ message: "Failed to fetch gamification profile", error: err.message });
  }
};

// ── 3. Get Challenge History ──────────────────────────────────
const getChallengeHistory = async (req, res) => {
  try {
    const attempts = await ChallengeAttempt.find({
      userId: req.userId,
      completed: true,
    })
      .sort({ completedAt: -1 })
      .populate("challengeId", "title category difficulty type");

    res.json({ attempts });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch challenge history", error: err.message });
  }
};

module.exports = {
  getLeaderboard,
  getGamificationProfile,
  getChallengeHistory,
};
