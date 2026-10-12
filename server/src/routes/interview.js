const express = require("express");
const {
  getCompanyProfilesList,
  startInterview,
  submitAnswer,
  skipQuestion,
  getInterviews,
  getInterview,
  finishInterview,
} = require("../controllers/interviewcontroller.js");
const { protect } = require("../middleware/auth.js");

const router = express.Router();

router.use(protect); // all routes require auth

router.get("/company-profiles", getCompanyProfilesList);
router.post("/start", startInterview);
router.post("/submit-answer", submitAnswer);
router.post("/skip", skipQuestion);
router.post("/:id/finish", finishInterview);
router.get("/", getInterviews);
router.get("/:id", getInterview);

module.exports = router;

