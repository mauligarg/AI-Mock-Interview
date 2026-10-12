const jwt = require("jsonwebtoken");
const Session = require("../models/Session.js");
const User = require("../models/User.js");

const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const token = header.split(" ")[1];
    const secret = process.env.JWT_SECRET || "secret_jwt_key_fallback";
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User account no longer exists" });
    }

    // Check account lockout status
    if (user.lockUntil && user.lockUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockUntil - new Date()) / (60 * 1000));
      return res.status(423).json({
        message: `Account is temporarily locked due to failed login attempts. Please try again in ${waitMinutes} minutes.`,
      });
    }

    // Check session validity if sessionId is present in payload or headers
    const sessionId = decoded.sessionId || req.headers["x-session-id"];
    if (sessionId) {
      const session = await Session.findOne({ sessionId, userId: user._id });
      if (!session || !session.isActive) {
        return res.status(401).json({ message: "Session has been terminated or expired. Please log in again." });
      }

      // Update session lastActiveAt
      session.lastActiveAt = new Date();
      await session.save();
      req.session = session;
    }

    req.userId = user._id.toString();
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      message: "Please verify your email address to access this feature.",
      isEmailVerified: false,
    });
  }

  next();
};

module.exports = { protect, requireVerifiedEmail };