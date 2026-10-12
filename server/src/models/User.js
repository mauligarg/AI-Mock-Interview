const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, unique: true },
  password: { type: String, required: true, minlength: 8 },
  isEmailVerified: { type: Boolean, default: false },
  accountStatus: {
    type: String,
    enum: ["invited", "active", "disabled"],
    default: "active",
  },
  phone: { type: String, default: "" },
  specialization: { type: String, default: "" },
  mentorInviteTokenHash: { type: String, default: "" },
  mentorInviteExpires: { type: Date },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  emailVerificationTokenHash: { type: String, default: "" },
  emailVerificationExpires: { type: Date },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  passwordResetTokenHash: { type: String, default: "" },
  passwordResetExpires: { type: Date },
  passwordChangedAt: { type: Date, default: Date.now },
  passwordHistory: [
    {
      hash: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  role: {
    type: String,
    enum: ["student", "mentor", "admin"],
    default: "student",
  },
  permissions: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
