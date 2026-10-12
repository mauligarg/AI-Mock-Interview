const mongoose = require("mongoose");

const mentorAssignmentSchema = new mongoose.Schema({
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assignedAt: { type: Date, default: Date.now },
  active: { type: Boolean, default: true },
});

mentorAssignmentSchema.index({ mentorId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("MentorAssignment", mentorAssignmentSchema);
