const express = require("express");
const {
  register,
  resendVerification,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  getSecurityOverview,
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
  getLoginHistory,
  getAlerts,
  markAlertRead,
  verifyInviteToken,
  acceptInvite,
} = require("../controllers/authcontroller.js");

const { protect } = require("../middleware/auth.js");
const { authRateLimiter, sensitiveRateLimiter } = require("../middleware/rateLimiter.js");

const router = express.Router();

// Public routes
router.post("/register", authRateLimiter, register);
router.post("/resend-verification", sensitiveRateLimiter, resendVerification);
router.post("/verify-email", verifyEmail);
router.post("/verify-invite-token", verifyInviteToken);
router.post("/accept-invite", sensitiveRateLimiter, acceptInvite);
router.post("/login", authRateLimiter, login);
router.post("/forgot-password", sensitiveRateLimiter, forgotPassword);
router.post("/reset-password", sensitiveRateLimiter, resetPassword);

// Protected routes
router.get("/me", protect, getMe);
router.post("/change-password", protect, sensitiveRateLimiter, changePassword);
router.get("/security-overview", protect, getSecurityOverview);
router.get("/sessions", protect, getSessions);
router.delete("/sessions/:sessionId", protect, revokeSession);
router.delete("/sessions", protect, revokeAllOtherSessions);
router.get("/login-history", protect, getLoginHistory);
router.get("/alerts", protect, getAlerts);
router.put("/alerts/:alertId/read", protect, markAlertRead);

module.exports = router;