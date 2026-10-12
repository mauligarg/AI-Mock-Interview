const User = require("../models/User");
const Session = require("../models/Session");
const Interview = require("../models/Interview");
const ChallengeAttempt = require("../models/ChallengeAttempt");
const LoginActivity = require("../models/LoginActivity");
const SecurityAlert = require("../models/SecurityAlert");
const MentorAssignment = require("../models/MentorAssignment");
const PlatformSetting = require("../models/PlatformSetting");
const { ALLOWED_ROLES } = require("../config/permissions");
const {
  hashToken,
  generateRandomToken,
  logDevelopmentNotification,
} = require("../utils/security");

const { sendMentorInviteEmail } = require("../services/emailService");

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// ── GET PLATFORM METRICS OVERVIEW ──────────────────────────
const getPlatformOverview = async (req, res) => {
  try {
    // 1. Ensure any legacy users with missing/null role default to 'student'
    await User.updateMany(
      { $or: [{ role: { $exists: false } }, { role: null }, { role: { $nin: ALLOWED_ROLES } }] },
      { $set: { role: "student" } }
    );

    // 2. Query counts consistently from User collection
    const [
      totalUsers,
      studentCount,
      mentorCount,
      adminCount,
      activeSessionsCount,
      interviewCount,
      challengeCount,
      recentAlerts,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "mentor" }),
      User.countDocuments({ role: "admin" }),
      Session.countDocuments({ isActive: true }),
      Interview.countDocuments({ isComplete: true }),
      ChallengeAttempt.countDocuments({ isCompleted: true }),
      SecurityAlert.find({}).sort({ createdAt: -1 }).limit(10),
    ]);

    // Guarantee totalUsers === studentCount + mentorCount + adminCount
    const calculatedTotal = studentCount + mentorCount + adminCount;
    const finalTotalUsers = Math.max(totalUsers, calculatedTotal);

    res.json({
      metrics: {
        totalUsers: finalTotalUsers,
        studentCount,
        mentorCount,
        adminCount,
        activeSessionsCount,
        interviewCount,
        challengeCount,
      },
      recentAlerts,
    });
  } catch (err) {
    console.error("Admin overview error:", err);
    res.status(500).json({ message: "Server error fetching platform metrics" });
  }
};

// ── LIST USERS WITH SEARCH & ROLE FILTERING ────────────────
const getUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 50 } = req.query;
    const query = {};

    if (role && ALLOWED_ROLES.includes(role)) {
      if (role === "student") {
        query.$or = [
          { role: "student" },
          { role: { $exists: false } },
          { role: null },
        ];
      } else {
        query.role = role;
      }
    }

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      const searchCondition = [
        { name: searchRegex },
        { email: searchRegex },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchCondition }];
        delete query.$or;
      } else {
        query.$or = searchCondition;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password -passwordHistory -emailVerificationTokenHash -passwordResetTokenHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    // Format computed statuses (e.g. check if mentor invite is expired)
    const formattedUsers = users.map((u) => {
      const uObj = u.toObject();
      if (uObj.accountStatus === "invited" && uObj.mentorInviteExpires && new Date(uObj.mentorInviteExpires) < new Date()) {
        uObj.computedStatus = "invite_expired";
      } else {
        uObj.computedStatus = uObj.accountStatus || "active";
      }
      return uObj;
    });

    res.json({
      users: formattedUsers,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error fetching user list" });
  }
};

// ── ADMIN CREATE/INVITE MENTOR ACCOUNT ─────────────────────
const inviteMentor = async (req, res) => {
  try {
    const { name, email, phone, specialization } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Mentor name and email address are required" });
    }

    // Check existing email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email address already exists." });
    }

    // Generate cryptographic invitation token
    const rawInviteToken = generateRandomToken();
    const inviteTokenHash = hashToken(rawInviteToken);
    const inviteExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    // Random placeholder password (admin never knows or sets mentor password)
    const placeholderPassword = generateRandomToken();

    const mentor = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: placeholderPassword,
      role: "mentor",
      accountStatus: "invited",
      isEmailVerified: false,
      phone: phone ? phone.trim() : "",
      specialization: specialization ? specialization.trim() : "",
      mentorInviteTokenHash: inviteTokenHash,
      mentorInviteExpires: inviteExpires,
      invitedBy: req.userId,
    });

    // Record audit activity & alert
    const adminName = req.user ? req.user.name : "Admin";
    await LoginActivity.create({
      userId: mentor._id,
      action: "mentor_invited",
      success: true,
      reason: `Admin ${adminName} invited Mentor ${mentor.name}`,
    });

    await SecurityAlert.create({
      userId: mentor._id,
      type: "mentor_invited",
      severity: "info",
      message: `Mentor account invitation created for ${mentor.name} (${mentor.email}) by ${adminName}.`,
    });

    // Dispatch mentor invitation email via centralized email service
    const emailResult = await sendMentorInviteEmail({
      to: mentor.email,
      name: mentor.name,
      rawToken: rawInviteToken,
    });

    const responsePayload = {
      message: `Mentor invitation created for ${mentor.name}. Invitation email sent successfully.`,
      user: {
        id: mentor._id,
        name: mentor.name,
        email: mentor.email,
        role: mentor.role,
        accountStatus: mentor.accountStatus,
      },
    };

    if (process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_AUTH_LINKS === "true") {
      responsePayload.devInviteUrl = emailResult.inviteUrl;
    }

    res.status(201).json(responsePayload);
  } catch (err) {
    console.error("Error inviting mentor:", err);
    res.status(500).json({ message: "Server error creating mentor invitation", error: err.message });
  }
};

// ── RESEND MENTOR INVITATION ──────────────────────────────
const resendMentorInvite = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "mentor" || user.accountStatus !== "invited") {
      return res.status(400).json({ message: "Resending invitation is only applicable for pending invited mentor accounts." });
    }

    const rawInviteToken = generateRandomToken();
    user.mentorInviteTokenHash = hashToken(rawInviteToken);
    user.mentorInviteExpires = new Date(Date.now() + 72 * 60 * 60 * 1000);
    await user.save();

    const emailResult = await sendMentorInviteEmail({
      to: user.email,
      name: user.name,
      rawToken: rawInviteToken,
    });

    const responsePayload = {
      message: `Invitation resent successfully to ${user.name}.`,
    };

    if (process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_AUTH_LINKS === "true") {
      responsePayload.devInviteUrl = emailResult.inviteUrl;
    }

    res.json(responsePayload);
  } catch (err) {
    res.status(500).json({ message: "Server error resending mentor invitation" });
  }
};

// ── REVOKE PENDING MENTOR INVITATION ──────────────────────
const revokeMentorInvite = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.accountStatus !== "invited") {
      return res.status(400).json({ message: "Only pending invited accounts can be revoked." });
    }

    await User.findByIdAndDelete(userId);

    res.json({ message: `Pending mentor invitation for ${user.name} has been revoked.` });
  } catch (err) {
    res.status(500).json({ message: "Server error revoking mentor invitation" });
  }
};

// ── UPDATE ACCOUNT STATUS (ACTIVE / DISABLED) ─────────────
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!["active", "disabled"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'active' or 'disabled'" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.accountStatus = status;
    await user.save();

    if (status === "disabled") {
      // Invalidate all active sessions for disabled user
      await Session.updateMany(
        { userId: user._id, isActive: true },
        { isActive: false, revokedAt: new Date() }
      );
    }

    await SecurityAlert.create({
      userId: user._id,
      type: "account_status_changed",
      severity: status === "disabled" ? "critical" : "info",
      message: `Account status updated to '${status}' by Administrator (${req.user.name}).`,
    });

    res.json({ message: `Account status for ${user.name} updated to '${status}'.` });
  } catch (err) {
    res.status(500).json({ message: "Server error updating user status" });
  }
};

// ── UPDATE USER ROLE ───────────────────────────────────────
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        message: `Invalid role specified. Allowed roles: ${ALLOWED_ROLES.join(", ")}`,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldRole = user.role || "student";
    user.role = role;
    await user.save();

    await SecurityAlert.create({
      userId: user._id,
      type: "role_change",
      severity: "warning",
      message: `Role changed from ${oldRole} to ${role} by Administrator (${req.user.name}).`,
    });

    res.json({
      message: `User role updated successfully to '${role}'`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Error updating user role:", err);
    res.status(500).json({ message: "Server error updating user role" });
  }
};

// ── ASSIGN MENTOR TO STUDENT ───────────────────────────────
const assignMentorStudent = async (req, res) => {
  try {
    const { mentorId, studentId } = req.body;

    if (!mentorId || !studentId) {
      return res.status(400).json({ message: "mentorId and studentId are required" });
    }

    const [mentor, student] = await Promise.all([
      User.findById(mentorId),
      User.findById(studentId),
    ]);

    if (!mentor || mentor.role !== "mentor") {
      return res.status(400).json({ message: "Target user is not a valid mentor" });
    }
    if (!student) {
      return res.status(400).json({ message: "Target student not found" });
    }

    const assignment = await MentorAssignment.findOneAndUpdate(
      { mentorId, studentId },
      { active: true, assignedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({
      message: `Assigned mentor '${mentor.name}' to student '${student.name}'`,
      assignment,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error creating mentor assignment" });
  }
};

// ── PLATFORM ACTIVITY LOGS ─────────────────────────────────
const getPlatformActivity = async (req, res) => {
  try {
    const [recentLogins, recentInterviews, recentChallenges, securityAlerts] = await Promise.all([
      LoginActivity.find({}).sort({ timestamp: -1 }).limit(20).populate("userId", "name email role"),
      Interview.find({ isComplete: true }).sort({ createdAt: -1 }).limit(10).populate("userId", "name email"),
      ChallengeAttempt.find({ isCompleted: true }).sort({ completedAt: -1 }).limit(10).populate("userId", "name email"),
      SecurityAlert.find({}).sort({ createdAt: -1 }).limit(15).populate("userId", "name email"),
    ]);

    res.json({
      recentLogins,
      recentInterviews,
      recentChallenges,
      securityAlerts,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error fetching platform activity logs" });
  }
};

// ── GET SYSTEM SETTINGS ────────────────────────────────────
const getSettings = async (req, res) => {
  try {
    const settings = await PlatformSetting.find({});
    // Default system config fallback if db empty
    const defaults = {
      maxFailedAttempts: 5,
      lockoutDurationMinutes: 15,
      passwordExpiryDays: 90,
      dailyChallengeXP: 100,
      weeklyChallengeXP: 500,
      singleSessionPolicy: true,
    };

    const result = { ...defaults };
    settings.forEach((s) => {
      result[s.key] = s.value;
    });

    res.json({ settings: result, raw: settings });
  } catch (err) {
    res.status(500).json({ message: "Server error fetching system settings" });
  }
};

// ── UPDATE SYSTEM SETTINGS ─────────────────────────────────
const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== "object") {
      return res.status(400).json({ message: "Invalid settings object provided" });
    }

    const updates = [];
    for (const [key, value] of Object.entries(settings)) {
      updates.push(
        PlatformSetting.findOneAndUpdate(
          { key },
          { value, updatedBy: req.userId, updatedAt: new Date() },
          { upsert: true, new: true }
        )
      );
    }

    await Promise.all(updates);

    res.json({ message: "System settings updated successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server error updating system settings" });
  }
};

module.exports = {
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
};
