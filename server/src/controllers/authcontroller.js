const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User.js");
const Session = require("../models/Session.js");
const LoginActivity = require("../models/LoginActivity.js");
const SecurityAlert = require("../models/SecurityAlert.js");
const {
  validatePasswordStrength,
  hashToken,
  generateRandomToken,
  parseUserAgent,
  logDevelopmentNotification,
} = require("../utils/security.js");
const { getEffectivePermissions } = require("../config/permissions.js");
const {
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
  sendVerificationEmail,
} = require("../services/emailService.js");

const JWT_SECRET = process.env.JWT_SECRET || "secret_jwt_key_fallback";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

const signToken = (userId, sessionId) =>
  jwt.sign({ userId, sessionId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

// ── REGISTER ──────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 1. Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: passwordValidation.errors[0],
        errors: passwordValidation.errors,
      });
    }

    // 2. Check duplicate email
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    // 3. Generate secure verification token
    const rawVerificationToken = generateRandomToken();
    const verificationTokenHash = hashToken(rawVerificationToken);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // 4. Create User (Default role is always student, ignoring body role overrides for security)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      isEmailVerified: false,
      role: "student",
      emailVerificationTokenHash: verificationTokenHash,
      emailVerificationExpires: verificationExpires,
    });

    // 5. Store initial password hash in history
    user.passwordHistory.push({ hash: user.password, createdAt: new Date() });
    await user.save();

    // 6. Send verification email via centralized email service
    const emailResult = await sendVerificationEmail({
      to: user.email,
      name: user.name,
      rawToken: rawVerificationToken,
    });

    // 7. Create Session
    const sessionId = crypto.randomBytes(16).toString("hex");
    const ua = req.headers["user-agent"] || "";
    const { browser, device } = parseUserAgent(ua);
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

    const session = await Session.create({
      userId: user._id,
      sessionId,
      userAgent: ua,
      browser,
      device,
      ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await LoginActivity.create({
      userId: user._id,
      ip,
      userAgent: ua,
      browser,
      device,
      success: true,
      action: "register",
      reason: "Initial registration",
    });

    const token = signToken(user._id.toString(), sessionId);

    const responsePayload = {
      message: "Account created successfully. Please check your email to verify your account.",
      token,
      sessionId,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        role: user.role || "student",
        permissions: user.permissions || [],
        effectivePermissions: getEffectivePermissions(user),
      },
    };

    if (process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_AUTH_LINKS === "true") {
      responsePayload.devVerificationUrl = emailResult.verificationUrl;
    }

    res.status(201).json(responsePayload);
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error during registration", error: err.message });
  }
};

// ── RESEND VERIFICATION ────────────────────────────────────
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({ message: "If an unverified account exists, a verification link has been sent." });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "This email address is already verified." });
    }

    const rawVerificationToken = generateRandomToken();
    user.emailVerificationTokenHash = hashToken(rawVerificationToken);
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const emailResult = await sendVerificationEmail({
      to: user.email,
      name: user.name,
      rawToken: rawVerificationToken,
    });

    const responsePayload = {
      message: "Verification email sent successfully.",
    };

    if (process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_AUTH_LINKS === "true") {
      responsePayload.devVerificationUrl = emailResult.verificationUrl;
    }

    res.json(responsePayload);
  } catch (err) {
    res.status(500).json({ message: "Server error while sending verification link" });
  }
};

// ── VERIFY EMAIL ──────────────────────────────────────────
const verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.body;
    if (!token || !email) {
      return res.status(400).json({ message: "Token and email are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "Invalid verification request." });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({ message: "Email is already verified. You can log in." });
    }

    const incomingHash = hashToken(token);
    if (
      !user.emailVerificationTokenHash ||
      user.emailVerificationTokenHash !== incomingHash ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired verification link. Please request a new one." });
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = "";
    user.emailVerificationExpires = null;
    await user.save();

    await SecurityAlert.create({
      userId: user._id,
      type: "email_verified",
      severity: "info",
      message: "Your email address has been successfully verified.",
    });

    res.json({ message: "Email verified successfully! You may now log in to access all features." });
  } catch (err) {
    res.status(500).json({ message: "Server error during email verification" });
  }
};

// ── VERIFY MENTOR INVITATION TOKEN ────────────────────────
const verifyInviteToken = async (req, res) => {
  try {
    const { token, email } = req.body;
    if (!token || !email) {
      return res.status(400).json({ message: "Invitation token and email address are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.accountStatus !== "invited") {
      return res.status(400).json({ message: "Invalid or expired invitation link." });
    }

    const incomingHash = hashToken(token);
    if (
      !user.mentorInviteTokenHash ||
      user.mentorInviteTokenHash !== incomingHash ||
      !user.mentorInviteExpires ||
      user.mentorInviteExpires < new Date()
    ) {
      return res.status(400).json({ message: "Invitation link has expired or is invalid. Please request a new invitation from your administrator." });
    }

    res.json({
      valid: true,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error verifying invitation token" });
  }
};

// ── ACCEPT MENTOR INVITATION & SET PASSWORD ────────────────
const acceptInvite = async (req, res) => {
  try {
    const { token, email, password } = req.body;
    const ua = req.headers["user-agent"] || "";
    const { browser, device } = parseUserAgent(ua);
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

    if (!token || !email || !password) {
      return res.status(400).json({ message: "Token, email, and new password are required" });
    }

    // 1. Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ message: passwordValidation.errors[0], errors: passwordValidation.errors });
    }

    // 2. Find user & verify token
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.accountStatus !== "invited") {
      return res.status(400).json({ message: "Invalid or expired invitation link." });
    }

    const incomingHash = hashToken(token);
    if (
      !user.mentorInviteTokenHash ||
      user.mentorInviteTokenHash !== incomingHash ||
      !user.mentorInviteExpires ||
      user.mentorInviteExpires < new Date()
    ) {
      return res.status(400).json({ message: "Invitation link has expired or is invalid." });
    }

    // 3. Set mentor password & activate account
    user.password = password; // pre-save hook hashes this
    user.accountStatus = "active";
    user.isEmailVerified = true;
    user.mentorInviteTokenHash = "";
    user.mentorInviteExpires = null;
    user.passwordChangedAt = new Date();
    await user.save();

    user.passwordHistory.push({ hash: user.password, createdAt: new Date() });
    await user.save();

    // 4. Create Session
    const sessionId = crypto.randomBytes(16).toString("hex");
    await Session.create({
      userId: user._id,
      sessionId,
      userAgent: ua,
      browser,
      device,
      ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await LoginActivity.create({
      userId: user._id,
      ip,
      userAgent: ua,
      browser,
      device,
      success: true,
      action: "mentor_invite_accepted",
      reason: "Mentor completed invitation setup and set password",
    });

    await SecurityAlert.create({
      userId: user._id,
      type: "mentor_onboarding_completed",
      severity: "info",
      message: "Mentor account onboarding completed successfully.",
    });

    const jwtToken = signToken(user._id.toString(), sessionId);

    res.json({
      message: "Mentor onboarding completed! Account is now active.",
      token: jwtToken,
      sessionId,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        role: user.role,
        permissions: user.permissions || [],
        effectivePermissions: getEffectivePermissions(user),
      },
    });
  } catch (err) {
    console.error("Error accepting invite:", err);
    res.status(500).json({ message: "Server error completing invitation setup", error: err.message });
  }
};

// ── LOGIN ─────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password, forceLogoutOther } = req.body;
    const ua = req.headers["user-agent"] || "";
    const { browser, device } = parseUserAgent(ua);
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Handle user not found (security: generic invalid credentials)
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 0. Check accountStatus
    if (user.accountStatus === "disabled") {
      return res.status(403).json({
        message: "Your account has been disabled by an administrator. Please contact support.",
      });
    }

    if (user.accountStatus === "invited") {
      return res.status(403).json({
        message: "Your account invitation is pending completion. Please click the invitation link sent to your email to set up your password.",
      });
    }

    // 1. Check account lockout status
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockUntil - new Date()) / (60 * 1000));

      await LoginActivity.create({
        userId: user._id,
        ip,
        userAgent: ua,
        browser,
        device,
        success: false,
        action: "login_attempt_during_lockout",
        reason: `Account locked. ${remainingMinutes} mins remaining`,
      });

      return res.status(423).json({
        message: `Account is temporarily locked due to repeated failed logins. Please try again in ${remainingMinutes} minute(s).`,
      });
    }

    // 2. Validate password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;

      let lockedOut = false;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
        lockedOut = true;

        await SecurityAlert.create({
          userId: user._id,
          type: "account_lockout",
          severity: "critical",
          message: `Account locked for ${LOCKOUT_DURATION_MINUTES} minutes after ${MAX_FAILED_ATTEMPTS} consecutive failed login attempts.`,
        });
      }

      await user.save();

      await LoginActivity.create({
        userId: user._id,
        ip,
        userAgent: ua,
        browser,
        device,
        success: false,
        action: "login_failed",
        reason: "Invalid password",
      });

      if (lockedOut) {
        return res.status(423).json({
          message: `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Please try again in ${LOCKOUT_DURATION_MINUTES} minutes.`,
        });
      }

      const attemptsRemaining = MAX_FAILED_ATTEMPTS - user.failedLoginAttempts;
      return res.status(401).json({
        message: `Invalid email or password. ${attemptsRemaining} attempt(s) remaining before temporary lockout.`,
      });
    }

    // 3. Password correct -> Reset lockout counters
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // 4. Duplicate Session Policy & Active Sessions Management
    // Invalidate prior sessions if forceLogoutOther or single active session policy
    if (forceLogoutOther) {
      await Session.updateMany(
        { userId: user._id, isActive: true },
        { isActive: false, revokedAt: new Date() }
      );
    } else {
      // Deactivate all previous sessions to enforce 1 active session per user policy
      await Session.updateMany(
        { userId: user._id, isActive: true },
        { isActive: false, revokedAt: new Date() }
      );
    }

    // 5. Detect suspicious login (new device or browser)
    const knownSession = await Session.findOne({ userId: user._id, device, browser });
    if (!knownSession) {
      await SecurityAlert.create({
        userId: user._id,
        type: "new_device_login",
        severity: "warning",
        message: `New login detected from ${browser} on ${device} (IP: ${ip}).`,
      });

      logDevelopmentNotification("Suspicious Login Detection", `New device login detected for ${user.email}`, {
        Browser: browser,
        Device: device,
        IP: ip,
      });
    }

    // 6. Create Session record
    const sessionId = crypto.randomBytes(16).toString("hex");
    const session = await Session.create({
      userId: user._id,
      sessionId,
      userAgent: ua,
      browser,
      device,
      ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // 7. Log Activity
    await LoginActivity.create({
      userId: user._id,
      ip,
      userAgent: ua,
      browser,
      device,
      success: true,
      action: "login",
      reason: "Successful login",
    });

    const token = signToken(user._id.toString(), sessionId);

    res.json({
      token,
      sessionId,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        role: user.role || "student",
        permissions: user.permissions || [],
        effectivePermissions: getEffectivePermissions(user),
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login", error: err.message });
  }
};

// ── FORGOT PASSWORD ───────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    // Generic safe response to prevent account enumeration vulnerabilities
    const genericSuccessMsg = "If an account exists for this email address, a password reset link has been sent.";

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({ message: genericSuccessMsg });
    }

    const rawResetToken = generateRandomToken();
    user.passwordResetTokenHash = hashToken(rawResetToken);
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
    await user.save();

    // Dispatch real email via Nodemailer email service
    const { resetUrl } = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      rawToken: rawResetToken,
    });

    const responsePayload = {
      message: genericSuccessMsg,
    };

    // Only expose dev reset URL when NOT in production AND DEV_SHOW_AUTH_LINKS is explicitly "true"
    if (process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_AUTH_LINKS === "true") {
      responsePayload.devResetUrl = resetUrl;
    }

    res.json(responsePayload);
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error while processing password reset request" });
  }
};

// ── RESET PASSWORD ────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Reset token and new password are required" });
    }

    // 1. Validate strength of new password against security policy
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.errors[0], errors: validation.errors });
    }

    // 2. Locate user either by email or by matching reset token hash
    const incomingHash = hashToken(token);
    let user;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    } else {
      user = await User.findOne({ passwordResetTokenHash: incomingHash });
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired password reset link." });
    }

    // 3. Verify token hash and expiration
    if (
      !user.passwordResetTokenHash ||
      user.passwordResetTokenHash !== incomingHash ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired password reset link. Please request a new one." });
    }

    // 4. Prevent password reuse (check history)
    for (const item of user.passwordHistory || []) {
      const matches = await bcrypt.compare(newPassword, item.hash);
      if (matches) {
        return res.status(400).json({
          message: "You cannot reuse a recent password. Please choose a different password.",
        });
      }
    }

    // 5. Update password & clear reset token (single-use)
    user.password = newPassword; // Pre-save hook hashes this
    user.passwordChangedAt = new Date();
    user.passwordResetTokenHash = "";
    user.passwordResetExpires = null;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    await user.save();

    // Store new hash in password history (capped at 5)
    user.passwordHistory.push({ hash: user.password, createdAt: new Date() });
    if (user.passwordHistory.length > 5) {
      user.passwordHistory.shift();
    }
    await user.save();

    // 6. Invalidate all active sessions for security
    await Session.updateMany(
      { userId: user._id, isActive: true },
      { isActive: false, revokedAt: new Date() }
    );

    // 7. Audit log & security alert
    const ua = req.headers["user-agent"] || "";
    const { browser, device } = parseUserAgent(ua);
    const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

    await LoginActivity.create({
      userId: user._id,
      ip,
      userAgent: ua,
      browser,
      device,
      success: true,
      action: "password_reset",
      reason: "Password reset via email token",
    });

    await SecurityAlert.create({
      userId: user._id,
      type: "password_reset",
      severity: "warning",
      message: "Your password was reset. All existing active sessions have been terminated.",
    });

    // 8. Send notification email if email service is enabled
    await sendPasswordResetSuccessEmail({ to: user.email, name: user.name });

    res.json({ message: "Password reset successfully! All active sessions were signed out. Please log in with your new password." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error during password reset", error: err.message });
  }
};

// ── CHANGE PASSWORD (AUTHENTICATED) ───────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Validate new password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.errors[0], errors: validation.errors });
    }

    // Check if new password is same as current
    if (await user.comparePassword(newPassword)) {
      return res.status(400).json({ message: "New password must be different from current password." });
    }

    // Check history
    for (const item of user.passwordHistory || []) {
      const matches = await bcrypt.compare(newPassword, item.hash);
      if (matches) {
        return res.status(400).json({ message: "You cannot reuse a recent password." });
      }
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    user.passwordHistory.push({ hash: user.password, createdAt: new Date() });
    if (user.passwordHistory.length > 5) user.passwordHistory.shift();
    await user.save();

    // Revoke other active sessions except current
    const currentSessionId = req.session ? req.session.sessionId : null;
    if (currentSessionId) {
      await Session.updateMany(
        { userId: user._id, sessionId: { $ne: currentSessionId }, isActive: true },
        { isActive: false, revokedAt: new Date() }
      );
    }

    await SecurityAlert.create({
      userId: user._id,
      type: "password_changed",
      severity: "info",
      message: "Your password was updated successfully.",
    });

    res.json({ message: "Password updated successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server error updating password" });
  }
};

// ── GET USER ME ───────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password -passwordHistory -emailVerificationTokenHash -passwordResetTokenHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    const userObj = user.toObject();
    userObj.role = userObj.role || "student";
    userObj.effectivePermissions = getEffectivePermissions(userObj);

    res.json({ user: userObj });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ── SECURITY OVERVIEW ─────────────────────────────────────
const getSecurityOverview = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("isEmailVerified passwordChangedAt createdAt");

    const activeSessionsCount = await Session.countDocuments({ userId, isActive: true });
    const alerts = await SecurityAlert.find({ userId }).sort({ createdAt: -1 }).limit(10);
    const recentLogins = await LoginActivity.find({ userId }).sort({ timestamp: -1 }).limit(10);

    res.json({
      isEmailVerified: user.isEmailVerified,
      passwordChangedAt: user.passwordChangedAt,
      accountCreatedAt: user.createdAt,
      activeSessionsCount,
      alerts,
      recentLogins,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error fetching security overview" });
  }
};

// ── GET ACTIVE SESSIONS ───────────────────────────────────
const getSessions = async (req, res) => {
  try {
    const userId = req.userId;
    const currentSessionId = req.session ? req.session.sessionId : null;

    const sessions = await Session.find({ userId, isActive: true }).sort({ lastActiveAt: -1 });

    const formatted = sessions.map((s) => ({
      sessionId: s.sessionId,
      device: s.device,
      browser: s.browser,
      ip: s.ip,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      isCurrent: s.sessionId === currentSessionId,
    }));

    res.json({ sessions: formatted });
  } catch (err) {
    res.status(500).json({ message: "Server error fetching sessions" });
  }
};

// ── REVOKE SINGLE SESSION ─────────────────────────────────
const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    const session = await Session.findOne({ sessionId, userId });
    if (!session) return res.status(404).json({ message: "Session not found" });

    session.isActive = false;
    session.revokedAt = new Date();
    await session.save();

    await SecurityAlert.create({
      userId,
      type: "session_revoked",
      severity: "info",
      message: `Active session on ${session.browser} (${session.device}) was manually terminated.`,
    });

    res.json({ message: "Session revoked successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error revoking session" });
  }
};

// ── REVOKE ALL OTHER SESSIONS ──────────────────────────────
const revokeAllOtherSessions = async (req, res) => {
  try {
    const userId = req.userId;
    const currentSessionId = req.session ? req.session.sessionId : null;

    await Session.updateMany(
      { userId, sessionId: { $ne: currentSessionId }, isActive: true },
      { isActive: false, revokedAt: new Date() }
    );

    res.json({ message: "All other sessions have been signed out." });
  } catch (err) {
    res.status(500).json({ message: "Server error revoking sessions" });
  }
};

// ── GET LOGIN HISTORY ─────────────────────────────────────
const getLoginHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const history = await LoginActivity.find({ userId }).sort({ timestamp: -1 }).limit(25);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ message: "Server error fetching login history" });
  }
};

// ── GET SECURITY ALERTS ───────────────────────────────────
const getAlerts = async (req, res) => {
  try {
    const userId = req.userId;
    const alerts = await SecurityAlert.find({ userId }).sort({ createdAt: -1 });
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ message: "Server error fetching alerts" });
  }
};

// ── MARK ALERT AS READ ────────────────────────────────────
const markAlertRead = async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = req.userId;

    await SecurityAlert.findOneAndUpdate({ _id: alertId, userId }, { read: true });
    res.json({ message: "Alert marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error updating alert" });
  }
};

module.exports = {
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
};
