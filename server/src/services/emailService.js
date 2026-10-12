const nodemailer = require("nodemailer");
const { logDevelopmentNotification } = require("../utils/security");

/**
 * Creates Nodemailer SMTP transporter using environment variables.
 * Supports Gmail SMTP (App Password) and standard SMTP providers.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  // Gmail SMTP optimization
  if (host === "smtp.gmail.com" || (!host && user && user.includes("@gmail.com"))) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Diagnostic tool to verify Nodemailer SMTP connection.
 */
async function verifyTransporterConnection() {
  const transporter = createTransporter();
  if (!transporter) {
    const status = {
      configured: false,
      message: "SMTP credentials (SMTP_USER or SMTP_PASS) are missing from environment variables.",
    };
    console.warn("⚠️ [SMTP Diagnostic]", status.message);
    return status;
  }

  try {
    await transporter.verify();
    console.log("✅ [SMTP Diagnostic] Nodemailer SMTP connection verified successfully!");
    return { configured: true, verified: true, message: "SMTP connection verified successfully" };
  } catch (err) {
    console.error("❌ [SMTP Diagnostic] Transporter verification failed:");
    console.error(`   Message: ${err.message}`);
    console.error(`   Code: ${err.code || "N/A"}`);
    console.error(`   Command: ${err.command || "N/A"}`);
    console.error(`   Response: ${err.response || "N/A"}`);
    return {
      configured: true,
      verified: false,
      error: {
        message: err.message,
        code: err.code,
        command: err.command,
        response: err.response,
      },
    };
  }
}

/**
 * Sends a Password Reset email containing the raw token link.
 */
async function sendPasswordResetEmail({ to, name, rawToken }) {
  const frontendUrl = (process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
  const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(to)}`;
  const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER || '"AI Interview Platform" <no-reply@aiinterview.com>';

  const transporter = createTransporter();

  if (transporter) {
    try {
      const mailOptions = {
        from: mailFrom,
        to,
        subject: "Reset Your AI Interview Platform Password",
        text: `Hello ${name || "User"},\n\nWe received a request to reset your password.\n\nPlease click the link below to set a new password:\n${resetUrl}\n\nThis link will expire in 15 minutes.\n\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\nAI Interview Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee;">
              <h2 style="color: #4f46e5; margin: 0;">AI Interview Platform</h2>
            </div>
            <div style="padding: 20px 0; color: #333333; line-height: 1.6;">
              <p style="font-size: 16px;">Hello <strong>${name || "User"}</strong>,</p>
              <p>We received a request to reset your password for your account.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
              </div>
              <p style="font-size: 14px; color: #666666;">Or copy and paste this link into your browser:</p>
              <p style="font-size: 13px; font-family: monospace; word-break: break-all; background-color: #f4f4f5; padding: 10px; border-radius: 4px; color: #333333;">${resetUrl}</p>
              <p style="font-size: 14px; color: #dc2626; font-weight: 500; margin-top: 20px;">⏰ This link will expire in 15 minutes.</p>
              <p style="font-size: 14px; color: #666666;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #999999;">
              &copy; ${new Date().getFullYear()} AI Interview Platform. All rights reserved.
            </div>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`📧 Password reset email dispatched to ${to}`);
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   Accepted: ${JSON.stringify(info.accepted)}`);
      console.log(`   Rejected: ${JSON.stringify(info.rejected)}`);
      console.log(`   SMTP Response: ${info.response}`);

      return {
        success: true,
        sent: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        resetUrl,
      };
    } catch (err) {
      console.error(`❌ Failed to send password reset email to ${to}:`);
      console.error(`   Message: ${err.message}`);
      console.error(`   Code: ${err.code || "N/A"}`);
      console.error(`   Command: ${err.command || "N/A"}`);
      console.error(`   Response: ${err.response || "N/A"}`);

      if (process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_AUTH_LINKS === "true") {
        logDevelopmentNotification("Password Reset Email (Dev Mode)", `Reset link generated for ${to}`, {
          Email: to,
          "Reset URL": resetUrl,
          ExpiresIn: "15 minutes",
        });
      }
      return { success: false, sent: false, error: err.message, resetUrl };
    }
  }

  console.warn(`⚠️ SMTP not configured. Password reset email to ${to} was not dispatched.`);
  if (process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_AUTH_LINKS === "true") {
    logDevelopmentNotification("Password Reset Email (Dev Mode)", `Reset link generated for ${to}`, {
      Email: to,
      "Reset URL": resetUrl,
      ExpiresIn: "15 minutes",
    });
  }

  return { success: true, sent: false, resetUrl, warning: "SMTP_USER/PASS not configured" };
}

/**
 * Sends a Password Reset Success confirmation email.
 */
async function sendPasswordResetSuccessEmail({ to, name }) {
  const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER || '"AI Interview Platform" <no-reply@aiinterview.com>';
  const transporter = createTransporter();

  if (transporter) {
    try {
      const mailOptions = {
        from: mailFrom,
        to,
        subject: "Password Reset Successful - AI Interview Platform",
        text: `Hello ${name || "User"},\n\nYour password has been successfully reset. All active sessions have been signed out for security.\n\nIf you did not perform this change, please contact support immediately.\n\nBest regards,\nAI Interview Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee;">
              <h2 style="color: #4f46e5; margin: 0;">AI Interview Platform</h2>
            </div>
            <div style="padding: 20px 0; color: #333333; line-height: 1.6;">
              <p style="font-size: 16px;">Hello <strong>${name || "User"}</strong>,</p>
              <p style="color: #16a34a; font-weight: bold;">✅ Your password was successfully updated.</p>
              <p>All active sessions associated with your account have been signed out to ensure maximum security.</p>
              <p style="font-size: 14px; color: #dc2626; margin-top: 20px;">⚠️ If you did not perform this password update, please contact platform administrators immediately.</p>
            </div>
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #999999;">
              &copy; ${new Date().getFullYear()} AI Interview Platform. All rights reserved.
            </div>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`📧 Password reset confirmation email sent to ${to}`);
      return { success: true, sent: true, messageId: info.messageId };
    } catch (err) {
      console.error(`❌ Failed to send password reset confirmation email to ${to}:`, err.message);
      return { success: false, sent: false, error: err.message };
    }
  }

  return { success: true, sent: false };
}

/**
 * Sends an Email Verification link email.
 */
async function sendVerificationEmail({ to, name, rawToken }) {
  const frontendUrl = (process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
  const verificationUrl = `${frontendUrl}/verify-email?token=${rawToken}&email=${encodeURIComponent(to)}`;
  const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER || '"AI Interview Platform" <no-reply@aiinterview.com>';

  const transporter = createTransporter();

  if (transporter) {
    try {
      const mailOptions = {
        from: mailFrom,
        to,
        subject: "Verify Your Email Address - AI Interview Platform",
        text: `Hello ${name || "User"},\n\nThank you for registering on AI Interview Platform.\n\nPlease click the link below to verify your email address:\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nBest regards,\nAI Interview Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee;">
              <h2 style="color: #4f46e5; margin: 0;">AI Interview Platform</h2>
            </div>
            <div style="padding: 20px 0; color: #333333; line-height: 1.6;">
              <p style="font-size: 16px;">Hello <strong>${name || "User"}</strong>,</p>
              <p>Thank you for registering on the AI Interview Platform. Please verify your email address to activate full account features.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background-color: #10b981; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
              </div>
              <p style="font-size: 14px; color: #666666;">Or copy and paste this link into your browser:</p>
              <p style="font-size: 13px; font-family: monospace; word-break: break-all; background-color: #f4f4f5; padding: 10px; border-radius: 4px; color: #333333;">${verificationUrl}</p>
              <p style="font-size: 14px; color: #666666; margin-top: 20px;">⏰ This link will expire in 24 hours.</p>
            </div>
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #999999;">
              &copy; ${new Date().getFullYear()} AI Interview Platform. All rights reserved.
            </div>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`📧 Verification email dispatched to ${to}`);
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   Accepted: ${JSON.stringify(info.accepted)}`);
      console.log(`   Rejected: ${JSON.stringify(info.rejected)}`);
      console.log(`   SMTP Response: ${info.response}`);

      return {
        success: true,
        sent: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        verificationUrl,
      };
    } catch (err) {
      console.error(`❌ Failed to send verification email to ${to}:`);
      console.error(`   Message: ${err.message}`);
      console.error(`   Code: ${err.code || "N/A"}`);
      console.error(`   Command: ${err.command || "N/A"}`);
      console.error(`   Response: ${err.response || "N/A"}`);

      if (process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_AUTH_LINKS === "true") {
        logDevelopmentNotification("Email Verification Link (Dev Mode)", `Verification URL for ${to}`, {
          Email: to,
          "Verification URL": verificationUrl,
        });
      }
      return { success: false, sent: false, error: err.message, verificationUrl };
    }
  }

  console.warn(`⚠️ SMTP not configured. Verification email to ${to} was not dispatched.`);
  if (process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_AUTH_LINKS === "true") {
    logDevelopmentNotification("Email Verification Link (Dev Mode)", `Verification URL for ${to}`, {
      Email: to,
      "Verification URL": verificationUrl,
    });
  }

  return { success: true, sent: false, verificationUrl, warning: "SMTP_USER/PASS not configured" };
}

/**
 * Sends a Mentor Invitation email.
 */
async function sendMentorInviteEmail({ to, name, rawToken }) {
  const frontendUrl = (process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
  const inviteUrl = `${frontendUrl}/accept-invite?token=${rawToken}&email=${encodeURIComponent(to)}`;
  const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER || '"AI Interview Platform" <no-reply@aiinterview.com>';

  const transporter = createTransporter();

  if (transporter) {
    try {
      const mailOptions = {
        from: mailFrom,
        to,
        subject: "You're Invited to Join AI Interview Platform as a Mentor",
        text: `Hello ${name || "Mentor"},\n\nYou have been invited to join the AI Interview Platform as a Mentor.\n\nPlease click the link below to activate your mentor account and set your password:\n${inviteUrl}\n\nThis invitation will expire in 72 hours.\n\nBest regards,\nAI Interview Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee;">
              <h2 style="color: #4f46e5; margin: 0;">AI Interview Platform</h2>
            </div>
            <div style="padding: 20px 0; color: #333333; line-height: 1.6;">
              <p style="font-size: 16px;">Hello <strong>${name || "Mentor"}</strong>,</p>
              <p>You have been invited by platform administrators to join the AI Interview Platform as an authorized Mentor.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="background-color: #6366f1; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accept Mentor Invitation</a>
              </div>
              <p style="font-size: 14px; color: #666666;">Or copy and paste this link into your browser:</p>
              <p style="font-size: 13px; font-family: monospace; word-break: break-all; background-color: #f4f4f5; padding: 10px; border-radius: 4px; color: #333333;">${inviteUrl}</p>
              <p style="font-size: 14px; color: #666666; margin-top: 20px;">⏰ This invitation will expire in 72 hours.</p>
            </div>
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #999999;">
              &copy; ${new Date().getFullYear()} AI Interview Platform. All rights reserved.
            </div>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`📧 Mentor invitation email dispatched to ${to}`);
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   Accepted: ${JSON.stringify(info.accepted)}`);
      console.log(`   Rejected: ${JSON.stringify(info.rejected)}`);
      console.log(`   SMTP Response: ${info.response}`);

      return {
        success: true,
        sent: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        inviteUrl,
      };
    } catch (err) {
      console.error(`❌ Failed to send mentor invitation email to ${to}:`);
      console.error(`   Message: ${err.message}`);
      console.error(`   Code: ${err.code || "N/A"}`);
      console.error(`   Command: ${err.command || "N/A"}`);
      console.error(`   Response: ${err.response || "N/A"}`);

      if (process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_AUTH_LINKS === "true") {
        logDevelopmentNotification("Mentor Invitation Link (Dev Mode)", `Invite link for ${to}`, {
          Email: to,
          "Invite URL": inviteUrl,
        });
      }
      return { success: false, sent: false, error: err.message, inviteUrl };
    }
  }

  console.warn(`⚠️ SMTP not configured. Mentor invitation email to ${to} was not dispatched.`);
  if (process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_AUTH_LINKS === "true") {
    logDevelopmentNotification("Mentor Invitation Link (Dev Mode)", `Invite link for ${to}`, {
      Email: to,
      "Invite URL": inviteUrl,
    });
  }

  return { success: true, sent: false, inviteUrl, warning: "SMTP_USER/PASS not configured" };
}

function getSMTPDiagnostics() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const configured = !!(user && pass);
  return {
    configured,
    mode: configured ? "LIVE_SMTP" : "DEV_FALLBACK",
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    userConfigured: !!user,
    passConfigured: !!pass,
    message: configured
      ? "SMTP email service is LIVE and configured."
      : "SMTP credentials (SMTP_USER/SMTP_PASS) missing. Live mail delivery BLOCKED; token reset links managed securely.",
  };
}

module.exports = {
  createTransporter,
  verifyTransporterConnection,
  getSMTPDiagnostics,
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
  sendVerificationEmail,
  sendMentorInviteEmail,
};
