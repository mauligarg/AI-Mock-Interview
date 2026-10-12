const mongoose = require("mongoose");

const platformSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String, default: "" },
  category: { type: String, default: "general" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PlatformSetting", platformSettingSchema);
