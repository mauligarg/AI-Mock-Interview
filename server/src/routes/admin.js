const express = require("express");
const {
  getPlatformOverview,
  getUsers,
  inviteMentor,
  resendMentorInvite,
  revokeMentorInvite,
  updateUserStatus,
  updateUserRole,
  assignMentorStudent,
  getPlatformActivity,
  getSettings,
  updateSettings,
} = require("../controllers/adminController");
const { protect } = require("../middleware/auth");
const { requireRole, requirePermission } = require("../middleware/rbac");

const router = express.Router();

// Admin-only routes (Strictly protected by requireRole("admin") & requirePermission)
router.use(protect);
router.use(requireRole("admin"));

router.get("/overview", getPlatformOverview);
router.get("/users", requirePermission("user:manage"), getUsers);
router.post("/mentors/invite", requirePermission("user:manage"), inviteMentor);
router.post("/mentors/:userId/resend-invite", requirePermission("user:manage"), resendMentorInvite);
router.delete("/mentors/:userId/revoke-invite", requirePermission("user:manage"), revokeMentorInvite);
router.patch("/users/:userId/status", requirePermission("user:manage"), updateUserStatus);
router.patch("/users/:userId/role", requirePermission("role:manage"), updateUserRole);
router.post("/assignments", requirePermission("user:manage"), assignMentorStudent);
router.get("/activity", requirePermission("platform:view-activity"), getPlatformActivity);
router.get("/settings", requirePermission("settings:manage"), getSettings);
router.patch("/settings", requirePermission("settings:manage"), updateSettings);

module.exports = router;
