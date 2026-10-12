const mongoose = require("mongoose");

const loginActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  timestamp: { type: Date, default: Date.now },
  ip: { type: String, default: "" },
  userAgent: { type: String, default: "" },
  device: { type: String, default: "Unknown Device" },
  browser: { type: String, default: "Unknown Browser" },
  success: { type: Boolean, required: true },
  reason: { type: String, default: "" },
  action: { type: String, default: "login" }, // login, logout, password_reset, password_change, suspicious_login
});

module.exports = mongoose.model("LoginActivity", loginActivitySchema);
