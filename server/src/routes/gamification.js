const express = require("express");
const {
  getLeaderboard,
  getGamificationProfile,
  getChallengeHistory,
} = require("../controllers/gamificationController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect); // All routes require authentication

router.get("/leaderboard", getLeaderboard);
router.get("/profile", getGamificationProfile);
router.get("/history", getChallengeHistory);

module.exports = router;
