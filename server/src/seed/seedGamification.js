const GamificationProfile = require("../models/GamificationProfile");
const User = require("../models/User");

const DEMO_COMPETITORS = [
  { name: "Aarav Sharma", xp: 4820, rank: "Gold I", streak: 8, completed: 34, hrScore: 88, techScore: 92, aptScore: 95 },
  { name: "Simran Kaur", xp: 4610, rank: "Gold II", streak: 12, completed: 31, hrScore: 94, techScore: 86, aptScore: 90 },
  { name: "Dhruv Patel", xp: 4430, rank: "Gold II", streak: 6, completed: 29, hrScore: 82, techScore: 95, aptScore: 88 },
  { name: "Ananya Verma", xp: 3850, rank: "Gold III", streak: 5, completed: 25, hrScore: 90, techScore: 84, aptScore: 92 },
  { name: "Rohan Gupta", xp: 3200, rank: "Silver I", streak: 4, completed: 22, hrScore: 78, techScore: 89, aptScore: 85 },
  { name: "Priya Singh", xp: 2750, rank: "Silver II", streak: 7, completed: 19, hrScore: 86, techScore: 80, aptScore: 88 },
  { name: "Karan Malhotra", xp: 2100, rank: "Silver III", streak: 3, completed: 15, hrScore: 75, techScore: 82, aptScore: 80 },
  { name: "Sneha Reddy", xp: 1650, rank: "Bronze I", streak: 2, completed: 12, hrScore: 80, techScore: 76, aptScore: 84 },
  { name: "Vikram Joshi", xp: 1200, rank: "Bronze II", streak: 4, completed: 9, hrScore: 70, techScore: 78, aptScore: 75 },
  { name: "Neha Kapoor", xp: 850, rank: "Bronze III", streak: 1, completed: 6, hrScore: 72, techScore: 74, aptScore: 78 },
];

async function seedGamificationProfiles() {
  try {
    const existingCount = await GamificationProfile.countDocuments({});
    if (existingCount >= 10) {
      return;
    }

    for (let i = 0; i < DEMO_COMPETITORS.length; i++) {
      const comp = DEMO_COMPETITORS[i];
      const dummyEmail = `demo_user_${i + 1}@aiinterview.demo`;

      let user = await User.findOne({ email: dummyEmail });
      if (!user) {
        user = await User.create({
          name: comp.name,
          email: dummyEmail,
          password: "demopassword123",
        });
      }

      const profileExists = await GamificationProfile.findOne({ userId: user._id });
      if (!profileExists) {
        await GamificationProfile.create({
          userId: user._id,
          displayName: comp.name,
          isDemo: true,
          totalXP: comp.xp,
          currentRank: comp.rank,
          currentStreak: comp.streak,
          longestStreak: comp.streak + 2,
          lastActiveDateStr: new Date().toISOString().split("T")[0],
          totalChallengesCompleted: comp.completed,
          dailyCompletedCount: Math.floor(comp.completed * 0.6),
          weeklyCompletedCount: Math.floor(comp.completed * 0.4),
          bestScore: 98,
          badges: [
            { badgeId: "first_challenge", title: "First Challenge", description: "Completed first challenge", icon: "🔥" },
            { badgeId: "perfect_score", title: "Perfect Score", description: "Scored 100% on a challenge", icon: "🎯" },
          ],
          categoryStats: {
            HR: { completedCount: Math.floor(comp.completed / 3), totalScoreSum: comp.hrScore * 5, bestScore: comp.hrScore },
            Technical: { completedCount: Math.floor(comp.completed / 3), totalScoreSum: comp.techScore * 5, bestScore: comp.techScore },
            Aptitude: { completedCount: Math.floor(comp.completed / 3), totalScoreSum: comp.aptScore * 5, bestScore: comp.aptScore },
            "Domain-Specific": { completedCount: 2, totalScoreSum: 160, bestScore: 85 },
          },
          rankHistory: [
            { date: new Date(Date.now() - 14 * 86400000), periodLabel: "Week 1", xp: comp.xp - 1200, rank: "Silver III", leaderboardPosition: i + 5, percentile: 75 },
            { date: new Date(Date.now() - 7 * 86400000), periodLabel: "Week 2", xp: comp.xp - 500, rank: comp.rank, leaderboardPosition: i + 2, percentile: 85 },
            { date: new Date(), periodLabel: "Week 3", xp: comp.xp, rank: comp.rank, leaderboardPosition: i + 1, percentile: 90 },
          ],
        });
      }
    }
  } catch (err) {
    console.warn("Gamification seed error:", err.message);
  }
}

module.exports = seedGamificationProfiles;
