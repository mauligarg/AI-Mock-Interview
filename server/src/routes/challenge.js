const express = require("express");
const {
  getChallengesOverview,
  getDailyChallenge,
  getWeeklyChallenge,
  startPracticeChallenge,
  startAttempt,
  completeAttempt,
} = require("../controllers/challengeController");
const { getLeaderboard } = require("../controllers/gamificationController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect); // All routes require authentication

router.get("/overview", getChallengesOverview);
router.get("/daily", getDailyChallenge);
router.get("/weekly", getWeeklyChallenge);
router.get("/leaderboard", getLeaderboard);
router.post("/practice", startPracticeChallenge);
router.post("/:id/start", startAttempt);
router.post("/:id/complete", completeAttempt);

module.exports = router;
