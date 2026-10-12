// Configurable Gamification Settings for Peer Challenge Arena

const CHALLENGE_SCORING = {
  excellent: 100,
  good: 75,
  average: 50,
  weak: 25,
  incorrect: 0,
};

const RANK_THRESHOLDS = [
  { minXP: 0, rank: "Bronze III" },
  { minXP: 150, rank: "Bronze II" },
  { minXP: 350, rank: "Bronze I" },
  { minXP: 650, rank: "Silver III" },
  { minXP: 1050, rank: "Silver II" },
  { minXP: 1550, rank: "Silver I" },
  { minXP: 2200, rank: "Gold III" },
  { minXP: 3000, rank: "Gold II" },
  { minXP: 4000, rank: "Gold I" },
  { minXP: 5500, rank: "Platinum" },
  { minXP: 8000, rank: "Diamond" },
];

const ALL_BADGES = [
  {
    badgeId: "first_challenge",
    title: "First Challenge",
    description: "Complete your first challenge in the arena",
    icon: "🔥",
  },
  {
    badgeId: "perfect_score",
    title: "Perfect Score",
    description: "Score 100% on any challenge",
    icon: "🎯",
  },
  {
    badgeId: "speed_solver",
    title: "Speed Solver",
    description: "Complete a challenge in under 50% of the target time",
    icon: "⚡",
  },
  {
    badgeId: "technical_master",
    title: "Technical Master",
    description: "Complete 10 Technical category challenges",
    icon: "📚",
  },
  {
    badgeId: "hr_pro",
    title: "HR Pro",
    description: "Score 85%+ in an HR behavioral challenge",
    icon: "💬",
  },
  {
    badgeId: "aptitude_ace",
    title: "Aptitude Ace",
    description: "Complete an Aptitude challenge with 90%+ accuracy",
    icon: "🧠",
  },
  {
    badgeId: "streak_7",
    title: "7-Day Streak",
    description: "Maintain a daily challenge streak for 7 consecutive days",
    icon: "🔥",
  },
  {
    badgeId: "top_10",
    title: "Top 10",
    description: "Reach the Top 10 position on the Global Leaderboard",
    icon: "🏆",
  },
  {
    badgeId: "consistent_performer",
    title: "Consistent Performer",
    description: "Complete 25 total challenges",
    icon: "💎",
  },
];

function getRankFromXP(xp) {
  let matchedRank = RANK_THRESHOLDS[0].rank;
  for (const item of RANK_THRESHOLDS) {
    if (xp >= item.minXP) {
      matchedRank = item.rank;
    } else {
      break;
    }
  }
  return matchedRank;
}

module.exports = {
  CHALLENGE_SCORING,
  RANK_THRESHOLDS,
  ALL_BADGES,
  getRankFromXP,
};
