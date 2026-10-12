const Interview = require("../models/Interview.js");
const {
  DIFFICULTY_MAP,
  detectRepeatedAnswer,
  evaluateAnswer,
  calculateNextDifficulty,
  generateNextQuestion,
  generateFinalReport,
} = require("../services/adaptiveEngine.js");
const { getCompanyProfile, getAllCompanyProfiles, isValidCompanyKey } = require("../config/companyProfiles.js");

const TOTAL_QUESTIONS_PER_SESSION = 5;

// ── Get Company Profiles List ─────────────────────────────
const getCompanyProfilesList = async (req, res) => {
  try {
    const profiles = getAllCompanyProfiles();
    res.json({ companyProfiles: profiles });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch company profiles", error: err.message });
  }
};

// ── Start Interview ───────────────────────────────────────
const startInterview = async (req, res) => {
  try {
    const { domain = "General", company = "General", initializationKey } = req.body;

    // Validate company identifier if provided and not general
    if (company && String(company).toLowerCase() !== "general" && !isValidCompanyKey(company)) {
      return res.status(400).json({
        message: `Invalid or unsupported company profile identifier '${company}'.`,
        requestedCompany: company,
        validCompanies: getAllCompanyProfiles().map((p) => ({ key: p.key, name: p.name })),
      });
    }

    // 1️⃣ Idempotency Check: Reuse existing session if initializationKey matches
    if (initializationKey) {
      const existing = await Interview.findOne({ initializationKey, userId: req.userId });
      if (existing) {
        const firstQ = existing.questions[0] || {};
        const companyProfile = getCompanyProfile(existing.companyProfileKey || company || "general");
        return res.status(200).json({
          sessionId: existing._id,
          question: firstQ.questionText || "",
          topic: firstQ.topic || existing.domain,
          difficulty: existing.currentDifficulty || 2,
          difficultyLabel: DIFFICULTY_MAP[existing.currentDifficulty || 2],
          questionsAnswered: existing.questionsAnswered || 0,
          totalQuestions: TOTAL_QUESTIONS_PER_SESSION,
          company: existing.company || companyProfile.name,
          companyProfileKey: existing.companyProfileKey || companyProfile.key,
          interviewMode: existing.interviewMode || "Standard Adaptive",
          companyFocusAreas: existing.companyFocusAreas || companyProfile.focusAreas,
          companyDescription: companyProfile.description,
        });
      }
    }

    const companyProfile = getCompanyProfile(company);
    const initialDifficulty = 2; // Medium start
    const interviewMode = companyProfile.key !== "general" ? "Company Recruiter Simulation" : "Standard Adaptive";

    const firstQ = await generateNextQuestion({
      domain,
      currentTopic: domain,
      nextDifficulty: initialDifficulty,
      questionHistory: [],
      companyKey: companyProfile.key,
    });

    let interview;
    try {
      interview = await Interview.create({
        userId: req.userId,
        domain,
        company: companyProfile.name,
        companyProfileKey: companyProfile.key,
        interviewMode,
        companyFocusAreas: companyProfile.focusAreas,
        currentDifficulty: initialDifficulty,
        highestDifficulty: initialDifficulty,
        questionsAnswered: 0,
        initializationKey: initializationKey || undefined,
        status: "created",
        difficultyHistory: [
          {
            questionIndex: 1,
            difficulty: initialDifficulty,
            label: DIFFICULTY_MAP[initialDifficulty] || "Medium",
            reason: `${companyProfile.name} Recruiter Simulation initiated at Medium difficulty.`,
          },
        ],
        questions: [
          {
            questionId: "1",
            questionText: firstQ.questionText,
            topic: firstQ.topic,
            difficulty: initialDifficulty,
            classification: "Pending",
          },
        ],
        messages: [{ role: "ai", content: firstQ.questionText }],
      });
    } catch (createErr) {
      // Safe fallback for concurrent duplicate insertion requests
      if (initializationKey && (createErr.code === 11000 || createErr.message?.includes("E11000"))) {
        const existing = await Interview.findOne({ initializationKey, userId: req.userId });
        if (existing) {
          const firstQ = existing.questions[0] || {};
          return res.status(200).json({
            sessionId: existing._id,
            question: firstQ.questionText || "",
            topic: firstQ.topic || existing.domain,
            difficulty: existing.currentDifficulty || 2,
            difficultyLabel: DIFFICULTY_MAP[existing.currentDifficulty || 2],
            questionsAnswered: existing.questionsAnswered || 0,
            totalQuestions: TOTAL_QUESTIONS_PER_SESSION,
            company: existing.company || companyProfile.name,
            companyProfileKey: existing.companyProfileKey || companyProfile.key,
            interviewMode: existing.interviewMode || "Standard Adaptive",
            companyFocusAreas: existing.companyFocusAreas || companyProfile.focusAreas,
            companyDescription: companyProfile.description,
          });
        }
      }
      throw createErr;
    }

    res.status(201).json({
      sessionId: interview._id,
      question: firstQ.questionText,
      topic: firstQ.topic,
      difficulty: initialDifficulty,
      difficultyLabel: DIFFICULTY_MAP[initialDifficulty],
      questionsAnswered: 0,
      totalQuestions: TOTAL_QUESTIONS_PER_SESSION,
      company: companyProfile.name,
      companyProfileKey: companyProfile.key,
      interviewMode,
      companyFocusAreas: companyProfile.focusAreas,
      companyDescription: companyProfile.description,
    });
  } catch (err) {
    console.error("startInterview error:", err);
    res.status(500).json({ message: "Failed to start adaptive interview", error: err.message });
  }
};

// ── Submit Answer ─────────────────────────────────────────
const submitAnswer = async (req, res) => {
  try {
    const { sessionId, answer, domain = "General", questionsAnswered = 0 } = req.body;

    if (!sessionId || !answer || !answer.trim()) {
      return res.status(400).json({ message: "Session ID and answer text are required" });
    }

    const interview = await Interview.findOne({
      _id: sessionId,
      userId: req.userId,
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview session not found" });
    }

    // 1️⃣ Identify current active question index
    const activeIndex = interview.questions.length - 1;

    // 2️⃣ Collect ONLY previous questions' answers (exclude current question activeIndex)
    const previousAnswers = interview.questions
      .filter((q, idx) => idx !== activeIndex && q.answer && !q.skipped)
      .map((q) => q.answer);

    if (detectRepeatedAnswer(previousAnswers, answer)) {
      interview.repeatedAnswerCount = (interview.repeatedAnswerCount || 0) + 1;
      await interview.save();

      return res.json({
        repeatedAnswer: true,
        warningMessage:
          "This answer appears very similar to one of your previous responses. Please provide a more specific answer.",
        repeatedAnswerCount: interview.repeatedAnswerCount,
      });
    }

    let currentQ = interview.questions[activeIndex];
    if (!currentQ) {
      currentQ = {
        questionId: String(activeIndex + 1),
        questionText: "General Technical Question",
        topic: domain,
        difficulty: interview.currentDifficulty || 2,
      };
      interview.questions.push(currentQ);
    }

    // Reset consecutive skips on valid answer
    interview.consecutiveSkips = 0;

    // 3️⃣ Evaluate Answer
    const evalResult = await evaluateAnswer(
      domain,
      currentQ.questionText,
      answer,
      interview.currentDifficulty || 2,
      interview.companyProfileKey || "general"
    );

    // 4️⃣ Compute Difficulty Change
    const diffCalc = calculateNextDifficulty(
      interview.currentDifficulty || 2,
      evalResult.score,
      interview.consecutiveStrong || 0,
      interview.consecutiveWeak || 0,
      0
    );

    const prevDifficulty = interview.currentDifficulty || 2;
    const nextDifficulty = diffCalc.nextDifficulty;

    interview.currentDifficulty = nextDifficulty;
    interview.highestDifficulty = Math.max(interview.highestDifficulty || 1, nextDifficulty);
    interview.consecutiveStrong = diffCalc.consecutiveStrong;
    interview.consecutiveWeak = diffCalc.consecutiveWeak;

    // 5️⃣ Update question entry
    currentQ.answer = answer;
    currentQ.score = evalResult.score;
    currentQ.classification = evalResult.classification;
    currentQ.strengths = evalResult.strengths;
    currentQ.weaknesses = evalResult.weaknesses;
    currentQ.companyMetrics = evalResult.companyMetrics;
    currentQ.decisionReason = diffCalc.decisionReason;

    // Push to difficulty history
    interview.difficultyHistory.push({
      questionIndex: interview.questions.length + 1,
      difficulty: nextDifficulty,
      label: DIFFICULTY_MAP[nextDifficulty] || "Medium",
      reason: diffCalc.decisionReason,
    });

    // Append to messages
    interview.messages.push({ role: "user", content: answer });
    const weaknessDetail = evalResult.weaknesses && evalResult.weaknesses.length > 0
      ? ` Key Gaps: ${evalResult.weaknesses.join("; ")}.`
      : "";
    const feedbackSummary = `Score: ${evalResult.score}/10 (${evalResult.classification}).${weaknessDetail} ${diffCalc.decisionReason}`;
    interview.messages.push({ role: "ai", content: feedbackSummary });

    const newQuestionsAnswered = questionsAnswered + 1;
    interview.questionsAnswered = newQuestionsAnswered;

    const isComplete = newQuestionsAnswered >= TOTAL_QUESTIONS_PER_SESSION;

    if (isComplete) {
      interview.isComplete = true;
      interview.status = "completed";
      interview.completedAt = new Date();
      interview.duration = Math.max(
        1,
        Math.round((Date.now() - interview.createdAt.getTime()) / 60000)
      );

      const finalReport = generateFinalReport(interview);
      interview.finalReport = finalReport;
      interview.score = finalReport.overallScore;
      interview.overallScore = finalReport.overallScore;
      interview.companyMetrics = finalReport.companySimulationSummary?.companyMetrics;
      interview.companyExpectationMatch = finalReport.companySimulationSummary?.expectationMatch;

      await interview.save();

      // Recalculate Placement Readiness automatically on interview completion
      const { generatePlacementReadiness } = require("../services/readinessEngine.js");
      generatePlacementReadiness(req.userId).catch((e) => console.warn("Readiness update error:", e.message));

      return res.json({
        feedback: feedbackSummary,
        score: evalResult.score,
        classification: evalResult.classification,
        strengths: evalResult.strengths,
        weaknesses: evalResult.weaknesses,
        currentDifficulty: prevDifficulty,
        nextDifficulty,
        difficultyDecision: diffCalc.decisionReason,
        isComplete: true,
        finalReport,
      });
    }

    // 6️⃣ Generate Next Question if not complete
    const nextQ = await generateNextQuestion({
      domain,
      currentTopic: currentQ.topic,
      nextDifficulty,
      previousQuestion: currentQ.questionText,
      previousAnswer: answer,
      previousScore: evalResult.score,
      strengths: evalResult.strengths,
      weaknesses: evalResult.weaknesses,
      questionHistory: interview.questions,
      companyKey: interview.companyProfileKey || "general",
    });

    interview.questions.push({
      questionId: String(interview.questions.length + 1),
      questionText: nextQ.questionText,
      topic: nextQ.topic,
      difficulty: nextDifficulty,
      classification: "Pending",
    });

    interview.status = "in_progress";
    interview.messages.push({ role: "ai", content: nextQ.questionText });
    await interview.save();

    return res.json({
      feedback: feedbackSummary,
      score: evalResult.score,
      classification: evalResult.classification,
      strengths: evalResult.strengths,
      weaknesses: evalResult.weaknesses,
      currentDifficulty: prevDifficulty,
      nextDifficulty,
      difficultyDecision: diffCalc.decisionReason,
      nextQuestion: nextQ.questionText,
      nextTopic: nextQ.topic,
      isComplete: false,
    });
  } catch (err) {
    console.error("submitAnswer error:", err);
    res.status(500).json({ message: "Failed to submit answer", error: err.message });
  }
};

// ── Skip Question ─────────────────────────────────────────
const skipQuestion = async (req, res) => {
  try {
    const { sessionId, domain = "General", questionsAnswered = 0 } = req.body;

    const interview = await Interview.findOne({
      _id: sessionId,
      userId: req.userId,
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview session not found" });
    }

    interview.skippedCount = (interview.skippedCount || 0) + 1;
    interview.consecutiveSkips = (interview.consecutiveSkips || 0) + 1;

    const activeIndex = interview.questions.length - 1;
    let currentQ = interview.questions[activeIndex];
    if (currentQ) {
      currentQ.skipped = true;
      currentQ.score = 0;
      currentQ.classification = "Skipped";
      currentQ.decisionReason = "Question was skipped by candidate.";
    }

    const diffCalc = calculateNextDifficulty(
      interview.currentDifficulty || 2,
      0,
      0,
      0,
      interview.consecutiveSkips
    );

    const prevDifficulty = interview.currentDifficulty || 2;
    const nextDifficulty = diffCalc.nextDifficulty;
    interview.currentDifficulty = nextDifficulty;

    interview.difficultyHistory.push({
      questionIndex: interview.questions.length + 1,
      difficulty: nextDifficulty,
      label: DIFFICULTY_MAP[nextDifficulty] || "Medium",
      reason: diffCalc.decisionReason,
    });

    const newQuestionsAnswered = questionsAnswered + 1;
    interview.questionsAnswered = newQuestionsAnswered;

    const isComplete = newQuestionsAnswered >= TOTAL_QUESTIONS_PER_SESSION;

    if (isComplete) {
      interview.isComplete = true;
      interview.status = "completed";
      interview.completedAt = new Date();
      interview.duration = Math.max(
        1,
        Math.round((Date.now() - interview.createdAt.getTime()) / 60000)
      );

      const finalReport = generateFinalReport(interview);
      interview.finalReport = finalReport;
      interview.score = finalReport.overallScore;

      await interview.save();

      // Recalculate Placement Readiness automatically on interview completion
      const { generatePlacementReadiness } = require("../services/readinessEngine.js");
      generatePlacementReadiness(req.userId).catch((e) => console.warn("Readiness update error:", e.message));

      return res.json({
        skipped: true,
        currentDifficulty: prevDifficulty,
        nextDifficulty,
        difficultyDecision: diffCalc.decisionReason,
        isComplete: true,
        finalReport,
      });
    }

    const nextQ = await generateNextQuestion({
      domain,
      currentTopic: currentQ ? currentQ.topic : domain,
      nextDifficulty,
      previousQuestion: currentQ ? currentQ.questionText : "",
      previousAnswer: "Skipped",
      previousScore: 0,
      questionHistory: interview.questions,
      companyKey: interview.companyProfileKey || "general",
    });

    interview.questions.push({
      questionId: String(interview.questions.length + 1),
      questionText: nextQ.questionText,
      topic: nextQ.topic,
      difficulty: nextDifficulty,
      classification: "Pending",
    });

    interview.status = "in_progress";
    await interview.save();

    return res.json({
      skipped: true,
      currentDifficulty: prevDifficulty,
      nextDifficulty,
      difficultyDecision: diffCalc.decisionReason,
      nextQuestion: nextQ.questionText,
      nextTopic: nextQ.topic,
      isComplete: false,
    });
  } catch (err) {
    console.error("skipQuestion error:", err);
    res.status(500).json({ message: "Failed to skip question", error: err.message });
  }
};

// ── Get All Completed Interviews ──────────────────────────
const getInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({
      userId: req.userId,
      isComplete: true,
    })
      .select("domain company companyProfileKey interviewMode companyFocusAreas score duration questionsAnswered createdAt finalReport currentDifficulty highestDifficulty")
      .sort({ createdAt: -1 });

    const mapped = interviews.map((i) => ({
      id: i._id,
      topic: i.domain,
      company: i.company || "General",
      companyProfileKey: i.companyProfileKey || "general",
      interviewMode: i.interviewMode || "Standard Adaptive",
      companyFocusAreas: i.companyFocusAreas || [],
      score: i.score,
      duration: i.duration,
      date: i.createdAt,
      finalReport: i.finalReport,
      currentDifficulty: i.currentDifficulty,
      highestDifficulty: i.highestDifficulty,
    }));

    res.json({ interviews: mapped });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch interviews", error: err.message });
  }
};

// ── Get Single Interview State / Details ──────────────────
const getInterview = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    res.json({ interview });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── Finish Interview Manually ─────────────────────────────
const finishInterview = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    interview.isComplete = true;
    interview.completedAt = new Date();
    interview.duration = Math.max(
      1,
      Math.round((Date.now() - interview.createdAt.getTime()) / 60000)
    );

    const finalReport = generateFinalReport(interview);
    interview.finalReport = finalReport;
    interview.score = finalReport.overallScore;

    await interview.save();

    res.json({ interview, finalReport });
  } catch (err) {
    res.status(500).json({ message: "Failed to complete interview", error: err.message });
  }
};

module.exports = {
  getCompanyProfilesList,
  startInterview,
  submitAnswer,
  skipQuestion,
  getInterviews,
  getInterview,
  finishInterview,
};

