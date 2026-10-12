const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sessionId: { type: String, required: true, unique: true },
  tokenHash: { type: String, default: "" },
  userAgent: { type: String, default: "" },
  device: { type: String, default: "Unknown Device" },
  browser: { type: String, default: "Unknown Browser" },
  ip: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  revokedAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model("Session", sessionSchema);
