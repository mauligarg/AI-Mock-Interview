const express = require("express");
const {
  getAssignedStudents,
  getStudentDetail,
  createStudentFeedback,
  getMyFeedbacks,
} = require("../controllers/mentorController");
const { protect } = require("../middleware/auth");
const { requireRole, requirePermission } = require("../middleware/rbac");

const router = express.Router();

// Student feedback route (Accessible to student)
router.get("/feedbacks/my", protect, getMyFeedbacks);

// Mentor-restricted routes
router.get(
  "/students",
  protect,
  requirePermission("student:view-assigned"),
  getAssignedStudents
);

router.get(
  "/students/:studentId",
  protect,
  requirePermission("student:view-assigned"),
  getStudentDetail
);

router.post(
  "/students/:studentId/feedback",
  protect,
  requirePermission("mentor:feedback:create"),
  createStudentFeedback
);

module.exports = router;
