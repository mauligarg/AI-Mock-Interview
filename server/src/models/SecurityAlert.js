const mongoose = require("mongoose");

const securityAlertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, required: true },
  severity: { type: String, enum: ["info", "warning", "critical"], default: "info" },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});

module.exports = mongoose.model("SecurityAlert", securityAlertSchema);
