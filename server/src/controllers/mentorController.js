const User = require("../models/User");
const MentorAssignment = require("../models/MentorAssignment");
const MentorFeedback = require("../models/MentorFeedback");
const Interview = require("../models/Interview");
const PlacementReadiness = require("../models/PlacementReadiness");
const GamificationProfile = require("../models/GamificationProfile");

// ── GET ASSIGNED STUDENTS ──────────────────────────────────
const getAssignedStudents = async (req, res) => {
  try {
    const mentorId = req.userId;

    // Find active assignments for mentor
    const assignments = await MentorAssignment.find({ mentorId, active: true }).populate(
      "studentId",
      "name email isEmailVerified createdAt role"
    );

    const students = assignments
      .filter((a) => a.studentId)
      .map((a) => ({
        assignmentId: a._id,
        assignedAt: a.assignedAt,
        student: {
          id: a.studentId._id,
          _id: a.studentId._id,
          name: a.studentId.name,
          email: a.studentId.email,
          isEmailVerified: a.studentId.isEmailVerified,
          createdAt: a.studentId.createdAt,
        },
      }));

    res.json({ students });
  } catch (err) {
    console.error("Error fetching assigned students:", err);
    res.status(500).json({ message: "Server error fetching assigned students" });
  }
};

// ── GET STUDENT PERFORMANCE DETAILS (ASSIGNED MENTOR ONLY) ──
const getStudentDetail = async (req, res) => {
  try {
    const mentorId = req.userId;
    const { studentId } = req.params;

    // Security check: Mentor must be assigned to student (or user is admin)
    if (req.user.role !== "admin") {
      const isAssigned = await MentorAssignment.findOne({
        mentorId,
        studentId,
        active: true,
      });

      if (!isAssigned) {
        return res.status(403).json({
          message: "Forbidden: You are only authorized to view students assigned directly to you.",
        });
      }
    }

    const student = await User.findById(studentId).select("name email isEmailVerified createdAt role");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Fetch student data safely without exposing sensitive tokens/credentials
    let [interviews, readiness, challengeProfile, feedbackHistory] = await Promise.all([
      Interview.find({ userId: studentId, isComplete: true }).sort({ createdAt: -1 }).select("-messages"),
      PlacementReadiness.findOne({ userId: studentId }),
      GamificationProfile.findOne({ userId: studentId }),
      MentorFeedback.find({ studentId }).sort({ createdAt: -1 }).populate("mentorId", "name email"),
    ]);

    if (!readiness) {
      try {
        const { generatePlacementReadiness } = require("../services/readinessEngine.js");
        const resObj = await generatePlacementReadiness(studentId);
        readiness = resObj?.readiness || null;
      } catch (rErr) {
        console.warn("Auto-generate readiness error in mentorController:", rErr.message);
      }
    }

    const readinessScore = readiness
      ? (typeof readiness.currentScore === "number" ? readiness.currentScore : (readiness.overallReadinessScore || readiness.readinessIndex || 0))
      : 0;

    const readinessPayload = readiness
      ? {
          ...(typeof readiness.toObject === "function" ? readiness.toObject() : readiness),
          currentScore: readinessScore,
          overallReadinessScore: readinessScore,
          readinessIndex: readinessScore,
        }
      : null;

    const getInterviewDisplayScore = (i) => {
      if (!i) return 0;
      if (typeof i.displayScore === "number") return i.displayScore;
      if (typeof i.overallScore === "number" && i.overallScore > 0) return i.overallScore;
      if (typeof i.score === "number" && i.score > 0) return i.score;
      if (i.finalReport && typeof i.finalReport.overallScore === "number") return i.finalReport.overallScore;
      if (i.finalReport && i.finalReport.companySimulationSummary && typeof i.finalReport.companySimulationSummary.overallScore === "number") {
        return i.finalReport.companySimulationSummary.overallScore;
      }
      return i.overallScore || i.score || 0;
    };

    const mappedInterviews = (interviews || []).map((i) => {
      const displayScore = getInterviewDisplayScore(i);
      return {
        _id: i._id,
        id: i._id,
        domain: i.domain,
        company: i.company || "General",
        interviewMode: i.interviewMode || "Standard Adaptive",
        questionsAnswered: i.questionsAnswered || 0,
        isComplete: i.isComplete,
        score: displayScore,
        overallScore: displayScore,
        displayScore: displayScore,
        createdAt: i.createdAt,
        completedAt: i.completedAt,
        finalReport: i.finalReport,
        currentDifficulty: i.currentDifficulty,
        highestDifficulty: i.highestDifficulty,
      };
    });

    res.json({
      student: {
        id: student._id,
        _id: student._id,
        name: student.name,
        email: student.email,
        isEmailVerified: student.isEmailVerified,
        createdAt: student.createdAt,
      },
      interviews: mappedInterviews,
      readiness: readinessPayload,
      challengeStats: challengeProfile || null,
      feedbackHistory: feedbackHistory || [],
    });
  } catch (err) {
    console.error("Error fetching student details:", err);
    res.status(500).json({ message: "Server error fetching student performance details" });
  }
};

// ── CREATE MENTOR FEEDBACK ─────────────────────────────────
const createStudentFeedback = async (req, res) => {
  try {
    const mentorId = req.userId;
    const { studentId } = req.params;
    const { feedback, rating, interviewId } = req.body;

    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ message: "Feedback text is required" });
    }

    // Security check: Mentor assignment check
    if (req.user.role !== "admin") {
      const isAssigned = await MentorAssignment.findOne({
        mentorId,
        studentId,
        active: true,
      });

      if (!isAssigned) {
        return res.status(403).json({
          message: "Forbidden: You can only submit feedback for students assigned to you.",
        });
      }
    }

    const newFeedback = await MentorFeedback.create({
      mentorId,
      studentId,
      interviewId: interviewId || null,
      feedback: feedback.trim(),
      rating: rating ? Math.min(5, Math.max(1, Number(rating))) : undefined,
    });

    const populated = await MentorFeedback.findById(newFeedback._id).populate("mentorId", "name email");

    res.status(201).json({
      message: "Feedback provided successfully!",
      feedback: populated,
    });
  } catch (err) {
    console.error("Error creating mentor feedback:", err);
    res.status(500).json({ message: "Server error creating mentor feedback" });
  }
};

// ── GET FEEDBACK FOR LOGGED-IN STUDENT ─────────────────────
const getMyFeedbacks = async (req, res) => {
  try {
    const studentId = req.userId;
    const feedbacks = await MentorFeedback.find({ studentId })
      .sort({ createdAt: -1 })
      .populate("mentorId", "name email");

    res.json({ feedbacks });
  } catch (err) {
    res.status(500).json({ message: "Server error fetching feedback history" });
  }
};

module.exports = {
  getAssignedStudents,
  getStudentDetail,
  createStudentFeedback,
  getMyFeedbacks,
};
