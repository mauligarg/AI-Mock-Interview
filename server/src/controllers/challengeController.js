const Challenge = require("../models/Challenge");
const ChallengeAttempt = require("../models/ChallengeAttempt");
const GamificationProfile = require("../models/GamificationProfile");
const User = require("../models/User");
const { evaluateAnswer } = require("../services/adaptiveEngine");
const {
  getOrCreateDailyChallenge,
  getOrCreateWeeklyChallenge,
  createPracticeChallenge,
  getTodayDateString,
  getTodayWeekString,
} = require("../services/challengeEngine");
const {
  CHALLENGE_SCORING,
  ALL_BADGES,
  getRankFromXP,
} = require("../config/gamificationConfig");

// ── 1. Challenges Overview ────────────────────────────────────
const getChallengesOverview = async (req, res) => {
  try {
    const dailyChallenge = await getOrCreateDailyChallenge();
    const weeklyChallenge = await getOrCreateWeeklyChallenge();

    const todayStr = getTodayDateString();
    const weekStr = getTodayWeekString();

    const dailyAttempt = await ChallengeAttempt.findOne({
      userId: req.userId,
      challengeId: dailyChallenge._id,
      completed: true,
    });

    const weeklyAttempt = await ChallengeAttempt.findOne({
      userId: req.userId,
      challengeId: weeklyChallenge._id,
      completed: true,
    });

    let profile = await GamificationProfile.findOne({ userId: req.userId });
    if (!profile) {
      const user = await User.findById(req.userId);
      profile = await GamificationProfile.create({
        userId: req.userId,
        displayName: user ? user.name : "Competitor",
      });
    }

    // Sanitize questions so options don't reveal correctOptionId before attempt
    const sanitizeChallenge = (ch) => {
      const obj = ch.toObject();
      obj.questions = obj.questions.map((q) => {
        const { correctOptionId, ...rest } = q;
        return rest;
      });
      return obj;
    };

    res.json({
      dailyChallenge: {
        ...sanitizeChallenge(dailyChallenge),
        completed: !!dailyAttempt,
        attempt: dailyAttempt ? { score: dailyAttempt.score, accuracy: dailyAttempt.accuracy, xpEarned: dailyAttempt.xpEarned } : null,
      },
      weeklyChallenge: {
        ...sanitizeChallenge(weeklyChallenge),
        completed: !!weeklyAttempt,
        attempt: weeklyAttempt ? { score: weeklyAttempt.score, accuracy: weeklyAttempt.accuracy, xpEarned: weeklyAttempt.xpEarned } : null,
      },
      practiceCategories: ["HR", "Technical", "Aptitude", "Domain-Specific"],
      userSummary: {
        totalXP: profile.totalXP,
        currentRank: profile.currentRank,
        currentStreak: profile.currentStreak,
        longestStreak: profile.longestStreak,
        totalCompleted: profile.totalChallengesCompleted,
      },
    });
  } catch (err) {
    console.error("getChallengesOverview error:", err);
    res.status(500).json({ message: "Failed to load challenges overview", error: err.message });
  }
};

// ── 2. Get Daily Challenge ────────────────────────────────────
const getDailyChallenge = async (req, res) => {
  try {
    const daily = await getOrCreateDailyChallenge();
    const attempt = await ChallengeAttempt.findOne({
      userId: req.userId,
      challengeId: daily._id,
      completed: true,
    });

    const sanitized = daily.toObject();
    sanitized.questions = sanitized.questions.map((q) => {
      const { correctOptionId, ...rest } = q;
      return rest;
    });

    res.json({
      challenge: sanitized,
      completed: !!attempt,
      attempt,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load daily challenge", error: err.message });
  }
};

// ── 3. Get Weekly Challenge ───────────────────────────────────
const getWeeklyChallenge = async (req, res) => {
  try {
    const weekly = await getOrCreateWeeklyChallenge();
    const attempt = await ChallengeAttempt.findOne({
      userId: req.userId,
      challengeId: weekly._id,
      completed: true,
    });

    const sanitized = weekly.toObject();
    sanitized.questions = sanitized.questions.map((q) => {
      const { correctOptionId, ...rest } = q;
      return rest;
    });

    res.json({
      challenge: sanitized,
      completed: !!attempt,
      attempt,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load weekly challenge", error: err.message });
  }
};

// ── 4. Generate / Start Practice Challenge ────────────────────
const startPracticeChallenge = async (req, res) => {
  try {
    const { category = "Technical", domain = "General" } = req.body;
    const challenge = await createPracticeChallenge(category, domain);

    const sanitized = challenge.toObject();
    sanitized.questions = sanitized.questions.map((q) => {
      const { correctOptionId, ...rest } = q;
      return rest;
    });

    res.status(201).json({ challenge: sanitized });
  } catch (err) {
    res.status(500).json({ message: "Failed to start practice challenge", error: err.message });
  }
};

// ── 5. Start Challenge Attempt ────────────────────────────────
const startAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const challenge = await Challenge.findById(id);

    if (!challenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }

    // Anti-cheat check: One completed attempt for daily/weekly
    if (challenge.type === "daily" || challenge.type === "weekly") {
      const existingCompleted = await ChallengeAttempt.findOne({
        userId: req.userId,
        challengeId: challenge._id,
        completed: true,
      });

      if (existingCompleted) {
        return res.status(400).json({
          message: `You have already completed this ${challenge.type} challenge!`,
          attempt: existingCompleted,
        });
      }
    }

    // Find or create in-progress attempt
    let attempt = await ChallengeAttempt.findOne({
      userId: req.userId,
      challengeId: challenge._id,
      completed: false,
    });

    if (!attempt) {
      attempt = await ChallengeAttempt.create({
        userId: req.userId,
        challengeId: challenge._id,
        challengeType: challenge.type,
        category: challenge.category,
        periodKey: challenge.periodKey,
        answers: [],
        completed: false,
      });
    }

    const sanitized = challenge.toObject();
    sanitized.questions = sanitized.questions.map((q) => {
      const { correctOptionId, ...rest } = q;
      return rest;
    });

    res.json({
      attemptId: attempt._id,
      challenge: sanitized,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to start attempt", error: err.message });
  }
};

// ── 6. Complete Challenge Attempt (Server-Side Scoring) ────────
const completeAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const { attemptId, answers = [], timeTakenSeconds = 0 } = req.body;

    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }

    let attempt = await ChallengeAttempt.findOne({
      _id: attemptId,
      userId: req.userId,
    });

    if (!attempt) {
      attempt = await ChallengeAttempt.findOne({
        challengeId: challenge._id,
        userId: req.userId,
        completed: false,
      });
    }

    if (!attempt) {
      return res.status(400).json({ message: "No active challenge attempt found" });
    }

    if (attempt.completed) {
      return res.status(400).json({ message: "Attempt already submitted and calculated", attempt });
    }

    // 1️⃣ SERVER-SIDE SCORING CALCULATION
    const questions = challenge.questions || [];
    let processedAnswers = [];
    let totalScoreSum = 0;
    let strongCount = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const userAns = answers.find((a) => a.questionId === q.questionId || a.questionId === String(i + 1)) || answers[i] || {};

      let isCorrect = false;
      let qScore = 0;
      let classification = "Skipped";
      let feedback = "";
      let strengths = [];
      let weaknesses = [];

      if (userAns.skipped || (!userAns.userAnswer && !userAns.selectedOptionId)) {
        classification = "Skipped";
        qScore = 0;
      } else if (q.type === "mcq") {
        // Deterministic MCQ Scoring
        if (userAns.selectedOptionId && userAns.selectedOptionId === q.correctOptionId) {
          isCorrect = true;
          qScore = CHALLENGE_SCORING.excellent; // 100
          classification = "Exceptional";
          strengths = ["Correct option selected"];
          strongCount++;
        } else {
          isCorrect = false;
          qScore = CHALLENGE_SCORING.incorrect; // 0
          classification = "Incorrect";
          weaknesses = [`Selected ${userAns.selectedOptionId || "none"}. Correct answer was ${q.correctOptionId}`];
        }
      } else {
        // Subjective Evaluation via AI Adaptive Engine
        const evalResult = await evaluateAnswer(
          challenge.domain || "General",
          q.questionText,
          userAns.userAnswer || "",
          q.difficulty || 2,
          "general"
        );

        // Map 0-10 score to configurable 0-100 threshold
        if (evalResult.score >= 9) {
          qScore = CHALLENGE_SCORING.excellent; // 100
        } else if (evalResult.score >= 7) {
          qScore = CHALLENGE_SCORING.good; // 75
        } else if (evalResult.score >= 5) {
          qScore = CHALLENGE_SCORING.average; // 50
        } else if (evalResult.score >= 1) {
          qScore = CHALLENGE_SCORING.weak; // 25
        } else {
          qScore = CHALLENGE_SCORING.incorrect; // 0
        }

        classification = evalResult.classification;
        strengths = evalResult.strengths || [];
        weaknesses = evalResult.weaknesses || [];
        if (evalResult.score >= 7) strongCount++;
      }

      totalScoreSum += qScore;
      processedAnswers.push({
        questionId: q.questionId,
        questionText: q.questionText,
        questionType: q.type,
        userAnswer: userAns.userAnswer || "",
        selectedOptionId: userAns.selectedOptionId || "",
        isCorrect,
        score: qScore,
        classification,
        strengths,
        weaknesses,
        skipped: !!userAns.skipped,
      });
    }

    const maxScore = questions.length * 100;
    const accuracy = Math.round((totalScoreSum / maxScore) * 100);

    // 2️⃣ CALCULATE XP EARNED WITH BONUSES
    let xpEarned = Math.round((totalScoreSum / maxScore) * challenge.xpReward);
    
    // Speed Bonus: Completed under 50% time limit with >= 70% accuracy
    const targetSeconds = (challenge.timeLimitMinutes || 10) * 60;
    const isSpeedy = timeTakenSeconds > 0 && timeTakenSeconds <= targetSeconds * 0.5 && accuracy >= 70;
    if (isSpeedy) {
      xpEarned = Math.round(xpEarned * 1.15); // +15% bonus
    }

    // 3️⃣ UPDATE GAMIFICATION PROFILE & STREAKS
    let profile = await GamificationProfile.findOne({ userId: req.userId });
    if (!profile) {
      const user = await User.findById(req.userId);
      profile = await GamificationProfile.create({
        userId: req.userId,
        displayName: user ? user.name : "Competitor",
      });
    }

    const todayStr = getTodayDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

    if (profile.lastActiveDateStr === todayStr) {
      // Already active today, streak maintained
    } else if (profile.lastActiveDateStr === yesterdayStr) {
      profile.currentStreak += 1;
    } else {
      profile.currentStreak = 1;
    }

    profile.longestStreak = Math.max(profile.longestStreak, profile.currentStreak);
    profile.lastActiveDateStr = todayStr;

    profile.totalXP += xpEarned;
    profile.currentRank = getRankFromXP(profile.totalXP);
    profile.totalChallengesCompleted += 1;
    profile.bestScore = Math.max(profile.bestScore, totalScoreSum);

    if (challenge.type === "daily") profile.dailyCompletedCount += 1;
    if (challenge.type === "weekly") profile.weeklyCompletedCount += 1;

    // Update Category Stats
    const cat = challenge.category;
    if (profile.categoryStats[cat]) {
      profile.categoryStats[cat].completedCount += 1;
      profile.categoryStats[cat].totalScoreSum += totalScoreSum;
      profile.categoryStats[cat].bestScore = Math.max(profile.categoryStats[cat].bestScore, totalScoreSum);
    }

    // 4️⃣ BADGE UNLOCKING EVALUATION
    const unlockedBadgesNow = [];
    const existingBadgeIds = new Set(profile.badges.map((b) => b.badgeId));

    const checkAndAwardBadge = (badgeId) => {
      if (!existingBadgeIds.has(badgeId)) {
        const badgeDef = ALL_BADGES.find((b) => b.badgeId === badgeId);
        if (badgeDef) {
          const badgeObj = {
            badgeId: badgeDef.badgeId,
            title: badgeDef.title,
            description: badgeDef.description,
            icon: badgeDef.icon,
            unlockedAt: new Date(),
          };
          profile.badges.push(badgeObj);
          unlockedBadgesNow.push(badgeObj);
        }
      }
    };

    // Rule 1: First Challenge
    if (profile.totalChallengesCompleted >= 1) checkAndAwardBadge("first_challenge");

    // Rule 2: Perfect Score
    if (accuracy === 100) checkAndAwardBadge("perfect_score");

    // Rule 3: Speed Solver
    if (isSpeedy) checkAndAwardBadge("speed_solver");

    // Rule 4: Technical Master
    if (profile.categoryStats.Technical && profile.categoryStats.Technical.completedCount >= 10) {
      checkAndAwardBadge("technical_master");
    }

    // Rule 5: HR Pro
    if (cat === "HR" && accuracy >= 85) checkAndAwardBadge("hr_pro");

    // Rule 6: Aptitude Ace
    if (cat === "Aptitude" && accuracy >= 90) checkAndAwardBadge("aptitude_ace");

    // Rule 7: 7-Day Streak
    if (profile.currentStreak >= 7) checkAndAwardBadge("streak_7");

    // Rule 8: Consistent Performer
    if (profile.totalChallengesCompleted >= 25) checkAndAwardBadge("consistent_performer");

    // 5️⃣ LEADERBOARD POSITION & RANK MOVEMENT CALCULATION
    const allProfiles = await GamificationProfile.find({}).sort({ totalXP: -1 });
    const userIndex = allProfiles.findIndex((p) => p.userId.toString() === req.userId.toString());
    const currentLeaderboardPos = userIndex !== -1 ? userIndex + 1 : allProfiles.length + 1;
    const totalParticipants = allProfiles.length;

    // Rule 9: Top 10 Badge
    if (currentLeaderboardPos <= 10) checkAndAwardBadge("top_10");

    // Calculate Rank Movement compared to last history snapshot
    const lastHistory = profile.rankHistory[profile.rankHistory.length - 1];
    const previousPos = lastHistory ? lastHistory.leaderboardPosition : currentLeaderboardPos + 2;
    const rankMovement = previousPos - currentLeaderboardPos; // Positive means moved up (e.g. #24 -> #18 = +6)

    // Calculate Percentile
    const percentile = Math.min(99, Math.max(1, Math.round(((totalParticipants - currentLeaderboardPos + 1) / totalParticipants) * 100)));

    // Snapshot Rank History
    profile.rankHistory.push({
      date: new Date(),
      periodLabel: todayStr,
      xp: profile.totalXP,
      rank: profile.currentRank,
      leaderboardPosition: currentLeaderboardPos,
      percentile,
    });

    await profile.save();

    // 6️⃣ SAVE ATTEMPT RECORD
    attempt.answers = processedAnswers;
    attempt.score = totalScoreSum;
    attempt.maxScore = maxScore;
    attempt.accuracy = accuracy;
    attempt.timeTakenSeconds = timeTakenSeconds;
    attempt.xpEarned = xpEarned;
    attempt.rankAtCompletion = profile.currentRank;
    attempt.leaderboardPosition = currentLeaderboardPos;
    attempt.rankMovement = rankMovement;
    attempt.completed = true;
    attempt.completedAt = new Date();

    await attempt.save();

    res.json({
      success: true,
      attemptId: attempt._id,
      score: totalScoreSum,
      maxScore,
      accuracy,
      timeTakenSeconds,
      xpEarned,
      currentRank: profile.currentRank,
      currentStreak: profile.currentStreak,
      leaderboardPosition: currentLeaderboardPos,
      totalParticipants,
      rankMovement,
      percentile,
      unlockedBadges: unlockedBadgesNow,
      answers: processedAnswers,
    });
  } catch (err) {
    console.error("completeAttempt error:", err);
    res.status(500).json({ message: "Failed to complete challenge attempt", error: err.message });
  }
};

module.exports = {
  getChallengesOverview,
  getDailyChallenge,
  getWeeklyChallenge,
  startPracticeChallenge,
  startAttempt,
  completeAttempt,
};
