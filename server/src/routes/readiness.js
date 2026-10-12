const express = require("express");
const { protect } = require("../middleware/auth.js");
const {
  getReadiness,
  generateReadiness,
  getReadinessHistory,
  updateCandidateType,
} = require("../controllers/readinesscontroller.js");

const router = express.Router();

router.get("/", protect, getReadiness);
router.post("/generate", protect, generateReadiness);
router.get("/history", protect, getReadinessHistory);
router.put("/candidate-type", protect, updateCandidateType);

module.exports = router;
