const PlacementReadiness = require("../models/PlacementReadiness.js");
const { generatePlacementReadiness } = require("../services/readinessEngine.js");
const Interview = require("../models/Interview.js");
const Resume = require("../models/Resume.js");

const getReadiness = async (req, res) => {
  try {
    const userId = req.userId;
    const interviews = await Interview.find({ userId, isComplete: true });
    const resume = await Resume.findOne({ userId });

    const hasInterviews = interviews.length > 0;
    const hasResume = !!resume && (resume.skillsDetected?.length > 0 || resume.summary?.length > 0);

    let readiness = await PlacementReadiness.findOne({ userId });

    // Recalculate if no readiness doc exists OR if resume exists but readiness score hasn't factored it in
    const isStale =
      !readiness ||
      (hasResume && readiness.components?.resumeStrength === 0) ||
      (readiness && resume && new Date(resume.updatedAt) > new Date(readiness.updatedAt));

    if (isStale) {
      const result = await generatePlacementReadiness(userId);
      readiness = result.readiness;
    }

    res.json({
      readiness,
      hasInterviews,
      hasResume,
      hasData: hasInterviews || hasResume,
      onboardingStatus: hasInterviews || hasResume ? "active" : "needs_input",
      onboardingMessage: hasInterviews || hasResume
        ? "Real-time placement readiness calculated from candidate data."
        : "Complete your first adaptive interview or upload a resume to generate customized readiness analytics.",
    });
  } catch (error) {
    console.error("getReadiness error:", error);
    res.status(500).json({ message: "Failed to fetch readiness data", error: error.message });
  }
};

const generateReadiness = async (req, res) => {
  try {
    const userId = req.userId;
    const { targetDomain, candidateType } = req.body;

    const result = await generatePlacementReadiness(userId, targetDomain, candidateType);
    res.json(result);
  } catch (error) {
    console.error("generateReadiness error:", error);
    res.status(500).json({ message: "Failed to generate placement readiness report", error: error.message });
  }
};

const getReadinessHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const readiness = await PlacementReadiness.findOne({ userId }).select("history currentScore classification updatedAt");

    if (!readiness) {
      return res.json({ history: [], currentScore: 0 });
    }

    res.json({
      history: readiness.history || [],
      currentScore: readiness.currentScore,
      classification: readiness.classification,
    });
  } catch (error) {
    console.error("getReadinessHistory error:", error);
    res.status(500).json({ message: "Failed to fetch readiness history", error: error.message });
  }
};

const updateCandidateType = async (req, res) => {
  try {
    const userId = req.userId;
    const { candidateType, targetDomain } = req.body;

    console.log(`\n==================================================`);
    console.log(`[READINESS ENGINE DEBUG] candidateType received by backend: "${candidateType}"`);
    console.log(`[READINESS ENGINE DEBUG] targetDomain received: "${targetDomain || "Default/Preserved"}"`);

    if (!candidateType) {
      return res.status(400).json({ message: "Candidate type is required" });
    }

    const result = await generatePlacementReadiness(userId, targetDomain, candidateType, { appendHistory: false });
    
    console.log(`[READINESS ENGINE DEBUG] generated recommendation strategy: "${result.readiness?.candidateType}"`);
    console.log(`[READINESS ENGINE DEBUG] returned roadmap phase 1: "${result.readiness?.roadmap?.[0]?.phase}"`);
    console.log(`[READINESS ENGINE DEBUG] returned project 1 title: "${result.readiness?.recommendedProjects?.[0]?.title}"`);
    console.log(`==================================================\n`);

    res.json(result);
  } catch (error) {
    console.error("updateCandidateType error:", error);
    res.status(500).json({ message: "Failed to update candidate type", error: error.message });
  }
};

module.exports = {
  getReadiness,
  generateReadiness,
  getReadinessHistory,
  updateCandidateType,
};
