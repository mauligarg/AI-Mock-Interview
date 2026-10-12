const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const connectDB = require("./config/db.js");
require("dotenv").config();
const authRoutes = require("./routes/auth.js");
const interviewRoutes = require("./routes/interview.js");
const resumeRoutes = require("./routes/resume.js");
const readinessRoutes = require("./routes/readiness.js");
const challengeRoutes = require("./routes/challenge.js");
const gamificationRoutes = require("./routes/gamification.js");
const mentorRoutes = require("./routes/mentor.js");
const adminRoutes = require("./routes/admin.js");
const seedGamificationProfiles = require("./seed/seedGamification.js");
const ensureBootstrapAdmin = require("./utils/bootstrapAdmin.js");
const { verifyTransporterConnection } = require("./services/emailService.js");

connectDB().then(async () => {
  await seedGamificationProfiles();
  await ensureBootstrapAdmin();
  await verifyTransporterConnection();
});

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*") || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(null, true); // Allow for mobile/Postman dev clients
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint for Cloud Monitoring & Deployment Probes
app.get("/api/health", (req, res) => {
  const adaptive = require("./services/adaptiveEngine.js");
  const getModeFn = adaptive.getAIMode || adaptive.getGroqAIMode;
  const aiMode = typeof getModeFn === "function" ? getModeFn() : { mode: "LIVE", model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b" };
  res.json({
    status: "ok",
    service: "AI-Interview-Platform-Backend",
    timestamp: new Date().toISOString(),
    aiMode: aiMode.mode,
    aiModel: aiMode.model,
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/readiness", readinessRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/mentor", mentorRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({ message: "🚀 AI Interview Platform Backend Server Active!", health: "/api/health" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
