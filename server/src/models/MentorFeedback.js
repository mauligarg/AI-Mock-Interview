const mongoose = require("mongoose");

const mentorFeedbackSchema = new mongoose.Schema({
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  interviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Interview" },
  feedback: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MentorFeedback", mentorFeedbackSchema);
