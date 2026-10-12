const Groq = require("groq-sdk");
const Interview = require("../models/Interview.js");
const Resume = require("../models/Resume.js");
const PlacementReadiness = require("../models/PlacementReadiness.js");
const {
  readinessWeights,
  readinessThresholds,
  CLASSIFICATIONS,
  CANDIDATE_TYPES,
  DOMAIN_SKILL_EXPECTATIONS,
  getClassification,
} = require("../config/readinessConfig.js");

const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) return null;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
};

// ── 1. Calculate Component Scores ──────────────────────────────
async function calculateComponentScores(userId, targetDomainOverride, candidateTypeOverride) {
  // A. Fetch User's Interviews
  const interviews = await Interview.find({ userId, isComplete: true }).sort({ createdAt: 1 });
  const resume = await Resume.findOne({ userId });

  const hasInterviews = interviews.length > 0;
  const hasResume = !!resume && (resume.skillsDetected?.length > 0 || resume.summary?.length > 0);

  // Fetch Existing PlacementReadiness record if present to preserve candidateType/targetDomain
  const existingReadiness = await PlacementReadiness.findOne({ userId });

  // Determine Target Domain
  let targetDomain = targetDomainOverride || existingReadiness?.targetDomain || "General";
  if (!targetDomainOverride && !existingReadiness?.targetDomain && resume && resume.recommendedDomains?.length > 0) {
    targetDomain = resume.recommendedDomains[0].label || "General";
  } else if (!targetDomainOverride && !existingReadiness?.targetDomain && hasInterviews) {
    targetDomain = interviews[interviews.length - 1].domain || "General";
  }

  // Determine Candidate Type
  let candidateType = candidateTypeOverride || existingReadiness?.candidateType || CANDIDATE_TYPES.FRESHER;
  if (!candidateTypeOverride && !existingReadiness?.candidateType && resume) {
    if (resume.experienceLevel === "Senior" || resume.experienceLevel === "Mid") {
      candidateType = CANDIDATE_TYPES.EXPERIENCED;
    } else if (resume.experienceLevel === "Junior") {
      candidateType = CANDIDATE_TYPES.FRESHER;
    }
  }

  // ── 1. Interview Performance Score (40%) ─────────────────────
  let interviewPerformance = 0;
  let demonstratedWeakTopics = new Set();
  let demonstratedStrongTopics = new Set();
  let communicationPenalty = 0;
  let communicationBonus = 0;

  if (hasInterviews) {
    let weightedScoreSum = 0;
    let weightTotal = 0;
    let highestDiffAchieved = 1;

    interviews.forEach((session, idx) => {
      // Recency weight: recent interviews get higher weight
      const recencyWeight = 1 + (idx / interviews.length) * 0.5;
      const sessionScore = session.overallScore || session.score || 0;

      weightedScoreSum += sessionScore * recencyWeight;
      weightTotal += recencyWeight;

      highestDiffAchieved = Math.max(highestDiffAchieved, session.highestDifficulty || session.currentDifficulty || 1);

      // Collect topic strengths and weaknesses
      (session.questions || []).forEach((q) => {
        const topic = q.topic || session.domain;
        if (q.skipped || (q.score && q.score < 6)) {
          demonstratedWeakTopics.add(topic);
        } else if (q.score && q.score >= 8) {
          demonstratedStrongTopics.add(topic);
          // If a previously weak topic now scores >= 8, remove it from weak list
          demonstratedWeakTopics.delete(topic);
        }

        // Communication indicators from answer weaknesses/strengths
        (q.weaknesses || []).forEach((w) => {
          const lower = w.toLowerCase();
          if (lower.includes("brief") || lower.includes("shallow") || lower.includes("example") || lower.includes("unclear")) {
            communicationPenalty += 2;
          }
        });
        (q.strengths || []).forEach((s) => {
          const lower = s.toLowerCase();
          if (lower.includes("clear") || lower.includes("detailed") || lower.includes("structured") || lower.includes("expert")) {
            communicationBonus += 2;
          }
        });
      });
    });

    const avgScore = weightTotal > 0 ? weightedScoreSum / weightTotal : 0;
    const diffBonus = highestDiffAchieved === 3 ? 10 : highestDiffAchieved === 2 ? 5 : 0;
    interviewPerformance = Math.min(100, Math.round(avgScore + diffBonus));
  }

  // ── 2. Resume Strength Score (25%) ───────────────────────────
  let resumeStrength = 0;
  let detectedSkills = [];

  if (hasResume) {
    detectedSkills = (resume.skillsDetected || []).map((s) => s.trim());
    const baseLevelScore = resume.experienceLevel === "Senior" ? 88 : resume.experienceLevel === "Mid" ? 78 : 68;
    const skillsBonus = Math.min(20, detectedSkills.length * 2.5);
    const domainConf = (resume.recommendedDomains || [])[0]?.confidence || 75;

    resumeStrength = Math.min(100, Math.round(baseLevelScore * 0.5 + skillsBonus + domainConf * 0.3));
  }

  // ── 3. Skill Match Score (20%) ───────────────────────────────
  const expectedSkills = DOMAIN_SKILL_EXPECTATIONS[targetDomain] || DOMAIN_SKILL_EXPECTATIONS.General;
  const normalizedDetected = new Set(detectedSkills.map((s) => s.toLowerCase()));

  const existingSkills = [];
  const missingSkills = [];

  expectedSkills.forEach((skill) => {
    const lowerSkill = skill.toLowerCase();
    const isPresent = Array.from(normalizedDetected).some(
      (ds) => ds.includes(lowerSkill) || lowerSkill.includes(ds)
    );
    if (isPresent) {
      existingSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  });

  const skillMatch = Math.min(
    100,
    Math.round((existingSkills.length / Math.max(1, expectedSkills.length)) * 100)
  );

  // ── 4. Communication Score (15%) ─────────────────────────────
  let communication = 70; // Baseline default
  if (hasInterviews) {
    communication = Math.min(100, Math.max(40, 70 - communicationPenalty + communicationBonus));
  } else if (hasResume) {
    communication = 75;
  }

  // Calculate Overall Score via Central Config Weights
  const overallScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        interviewPerformance * readinessWeights.interviewPerformance +
          resumeStrength * readinessWeights.resumeStrength +
          skillMatch * readinessWeights.skillMatch +
          communication * readinessWeights.communication
      )
    )
  );

  const classification = getClassification(overallScore);

  return {
    hasInterviews,
    hasResume,
    targetDomain,
    candidateType,
    overallScore,
    classification,
    components: {
      interviewPerformance,
      resumeStrength,
      skillMatch,
      communication,
    },
    existingSkills,
    missingSkills,
    strongAreas: Array.from(demonstratedStrongTopics),
    weakAreas: Array.from(demonstratedWeakTopics),
  };
}

// ── 2. Generate Recommendations (AI or Fallback) ───────────────
async function generateRecommendations({
  candidateType,
  targetDomain,
  overallScore,
  components,
  weakAreas,
  missingSkills,
  existingSkills,
}) {
  const isFresher = candidateType === CANDIDATE_TYPES.FRESHER || candidateType === "Fresher";
  const isIntern = candidateType === CANDIDATE_TYPES.INTERNSHIP_SEEKER || candidateType === "Internship Seeker";
  const isExperienced = candidateType === CANDIDATE_TYPES.EXPERIENCED || candidateType === "Experienced Candidate";

  const groq = getGroqClient();

  if (groq) {
    try {
      const prompt = `You are a top-tier technical placement coach and career advisor.
Generate personalized, actionable placement readiness recommendations for a candidate.

Candidate Context:
- Candidate Type: ${candidateType}
- Target Domain: ${targetDomain}
- Overall Readiness Score: ${overallScore}/100
- Technical Interview Score: ${components.interviewPerformance}/100
- Resume Strength: ${components.resumeStrength}/100
- Skill Match: ${components.skillMatch}/100
- Communication Score: ${components.communication}/100
- Detected Weak Areas: ${weakAreas.join(", ") || "General optimization"}
- Missing Industry Skills: ${missingSkills.join(", ") || "Advanced tools"}
- Existing Skills: ${existingSkills.join(", ") || "Basics"}

Category Requirements for ${candidateType}:
${
  isFresher
    ? "- Focus on: CS fundamentals (OS, DBMS, OOP, Computer Networks), Data Structures & Algorithms (DSA), Git/GitHub workflow, basic interview prep, and beginner/intermediate projects."
    : isIntern
    ? "- Focus on: Practical deployable full-stack projects with live demo URLs, active GitHub portfolio, role-specific skills, API integration, moderate DSA, and internship coding tests."
    : "- Focus on: System Design, high-level architecture, distributed caching/scalability, database query indexing & optimization, technical ownership/leadership, and STAR behavioral interview preparation."
}

Return ONLY a valid JSON object with NO markdown, NO backticks:

{
  "communicationGaps": ["Tip 1 tailored for ${candidateType}", "Tip 2"],
  "roadmap": [
    { "phase": "Phase 1 — Focus Area", "duration": "1–2 weeks", "tasks": ["Task 1", "Task 2", "Task 3"] },
    { "phase": "Phase 2 — Build & Portfolio", "duration": "2–3 weeks", "tasks": ["Task 1", "Task 2", "Task 3"] },
    { "phase": "Phase 3 — Interview Readiness", "duration": "1–2 weeks", "tasks": ["Task 1", "Task 2"] }
  ],
  "recommendedTechnologies": ["Tech 1", "Tech 2", "Tech 3", "Tech 4"],
  "recommendedProjects": [
    {
      "title": "Project Title 1",
      "skills": ["Skill1", "Skill2"],
      "description": "Short description tailored for a ${candidateType}",
      "why": "Why this project helps them land a ${candidateType} position"
    },
    {
      "title": "Project Title 2",
      "skills": ["Skill1", "Skill2"],
      "description": "Short description",
      "why": "Why this helps"
    }
  ],
  "recommendedCertifications": [
    { "title": "Certification Title", "provider": "Provider Name", "isOptional": true }
  ],
  "interviewTopics": [
    { "topic": "Topic 1", "priority": "High" },
    { "topic": "Topic 2", "priority": "High" },
    { "topic": "Topic 3", "priority": "Medium" },
    { "topic": "Topic 4", "priority": "Low" }
  ]
}`;

      const modelName = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
      const response = await groq.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 1000,
      });

      const raw = response.choices[0].message.content.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      console.warn("Groq generateRecommendations fallback triggered:", err.message);
    }
  }

  // ── Deterministic Category-Specific Recommendations Engine ──────
  let communicationGaps = [];
  let roadmap = [];
  let recommendedTechnologies = [];
  let recommendedProjects = [];
  let recommendedCertifications = [];
  let interviewTopics = [];

  if (isExperienced) {
    communicationGaps = [
      "Justify high-level architectural trade-offs, system bottlenecks, and scalability decisions explicitly.",
      "Structure behavioral leadership responses using the STAR method (Situation, Task, Action, Result).",
      "Quantify technical impact (e.g., latency reduction, throughput scaling, cost optimization) in interview answers."
    ];

    roadmap = [
      {
        phase: "Phase 1 — System Design & Distributed Scalability",
        duration: "1–2 weeks",
        tasks: [
          `Study System Design patterns: Distributed Caching (Redis), Load Balancing & DB Sharding`,
          `Practice designing scalable systems (Rate Limiters, URL Shortener, Event Feeds)`,
          `Deep-dive into advanced ${targetDomain} internals, concurrency & memory management`
        ]
      },
      {
        phase: "Phase 2 — Architecture & Performance Optimization",
        duration: "2–3 weeks",
        tasks: [
          `Benchmark & optimize database query plans, B-Tree indexing & connection pooling`,
          `Refine system architecture for high availability, fault tolerance & sub-100ms latency`,
          `Draft behavioral leadership stories using the STAR framework`
        ]
      },
      {
        phase: "Phase 3 — Senior Technical & Executive Interviews",
        duration: "1–2 weeks",
        tasks: [
          `Simulate 4+ senior mock interviews covering System Design & Code Architecture`,
          `Practice whiteboarding architectural diagrams and defending technical decisions`,
          `Highlight technical ownership, system impact & team leadership on resume`
        ]
      }
    ];

    recommendedTechnologies = Array.from(new Set([
      "System Design & Microservices",
      "Redis / Distributed Caching",
      "Docker & Kubernetes",
      "Kafka / Message Queues",
      ...missingSkills.slice(0, 2)
    ])).slice(0, 5);

    recommendedProjects = [
      {
        title: "High-Throughput Distributed Microservices Engine",
        skills: ["System Design", "Microservices", "Redis", "Kafka", "Docker"],
        description: "Fault-tolerant event-driven architecture with distributed caching, rate limiting, and message queueing.",
        why: "Demonstrates senior-level architectural design, scalability awareness, and system resilience."
      },
      {
        title: "Database Query Optimization & Performance Pipeline",
        skills: ["PostgreSQL/MongoDB", "Database Indexing", "Query Profiling", "Benchmarking"],
        description: "Performance tuning benchmark analyzing query execution plans, B-Tree indexes, and connection pooling.",
        why: "Proves deep technical expertise in performance optimization and database internals."
      }
    ];

    recommendedCertifications = [
      {
        title: "AWS Certified Solutions Architect",
        provider: "Amazon Web Services",
        isOptional: true
      },
      {
        title: "Certified Kubernetes Administrator (CKA)",
        provider: "CNCF / Linux Foundation",
        isOptional: true
      }
    ];

    interviewTopics = [
      { topic: "System Design & Distributed Architecture", priority: "High" },
      { topic: "Database Indexing & Query Optimization", priority: "High" },
      { topic: `Advanced ${targetDomain} Internals & Concurrency`, priority: "High" },
      { topic: "Scalability, Caching & Message Queues", priority: "Medium" },
      { topic: "Behavioral Leadership (STAR Method)", priority: "Medium" },
      ...weakAreas.slice(0, 2).map((t) => ({ topic: t, priority: "High" }))
    ];
  } else if (isIntern) {
    communicationGaps = [
      "Explain project architecture and practical framework choices clearly during technical discussions.",
      "Elaborate on API conventions, request/response handling, and state management trade-offs.",
      "Highlight active open-source contributions and portfolio accomplishments in interview responses."
    ];

    roadmap = [
      {
        phase: "Phase 1 — Role Skills & API Integration",
        duration: "1–2 weeks",
        tasks: [
          `Master essential frameworks, libraries, and REST/GraphQL API integration in ${targetDomain}`,
          `Implement authentication (JWT/OAuth) and third-party API services`,
          `Practice moderate LeetCode array, string, and recursion problems`
        ]
      },
      {
        phase: "Phase 2 — Deployable Full-Stack Portfolio",
        duration: "2–3 weeks",
        tasks: [
          `Build and deploy a full-stack production application to Vercel/Render/Netlify`,
          `Include live demo links, responsive UI, and interactive features`,
          `Maintain active GitHub contribution graph and clean commit history`
        ]
      },
      {
        phase: "Phase 3 — Internship Coding & Project Walkthrough",
        duration: "1–2 weeks",
        tasks: [
          `Conduct live mock interviews explaining project architecture & code structure`,
          `Practice explaining design choices and API trade-offs verbally`,
          `Apply to target internships with tailored cover letters and live demo links`
        ]
      }
    ];

    recommendedTechnologies = Array.from(new Set([
      "React / Next.js",
      "REST & GraphQL APIs",
      "Node.js & Express",
      "PostgreSQL / MongoDB",
      "Vercel / Render Deployment",
      ...missingSkills.slice(0, 2)
    ])).slice(0, 5);

    recommendedProjects = [
      {
        title: `Deployable ${targetDomain} Production App`,
        skills: [targetDomain, "REST API", "Database", "Authentication", "Vercel/Render"],
        description: "Full-stack application featuring user auth, live API data, responsive UI, and public deployment.",
        why: "Provides a live working URL that proves production readiness to internship hiring managers."
      },
      {
        title: "Real-Time Collaboration & Task Platform",
        skills: ["WebSockets", "Database", "State Management", "Tailwind CSS"],
        description: "Interactive web app supporting real-time data sync, state management, and user interactions.",
        why: "Highlights modern development workflow, API integration, and asynchronous data handling."
      }
    ];

    recommendedCertifications = [
      {
        title: "Full-Stack Web Development Certificate",
        provider: "Meta / Udemy",
        isOptional: true
      },
      {
        title: `${targetDomain} Developer Specialist Badge`,
        provider: "HackerRank / LinkedIn",
        isOptional: true
      }
    ];

    interviewTopics = [
      { topic: "Practical API Design & Integration", priority: "High" },
      { topic: "Project Architecture & Code Walkthrough", priority: "High" },
      { topic: "Moderate DSA & Problem Solving", priority: "Medium" },
      { topic: "Git Branching & Deployment Workflows", priority: "Medium" },
      { topic: "Frontend/Backend Performance Basics", priority: "Low" },
      ...weakAreas.slice(0, 2).map((t) => ({ topic: t, priority: "High" }))
    ];
  } else {
    // Default: FRESHER
    communicationGaps = [
      "Structure technical answers clearly using: Definition → Core Explanation → Real-world/Code Example.",
      "Avoid brief 1-line responses on CS fundamentals; elaborate on underlying concepts and memory model.",
      "Practice explaining fundamental algorithms and OOP design choices step by step."
    ];

    roadmap = [
      {
        phase: "Phase 1 — CS Fundamentals & DSA Foundations",
        duration: "1–2 weeks",
        tasks: [
          `Master Core CS subjects (OS, DBMS, Computer Networks, OOP principles)`,
          `Solve 30+ fundamental DSA problems (Arrays, Strings, Hash Tables, Sorting)`,
          `Strengthen core syntax and memory mechanics in ${targetDomain}`
        ]
      },
      {
        phase: "Phase 2 — Project Development & GitHub Portfolio",
        duration: "2–3 weeks",
        tasks: [
          `Build a clean, modular ${targetDomain} application demonstrating OOP & CRUD principles`,
          `Establish Git version control workflow, push code & write a detailed GitHub README`,
          `Refine resume with academic projects, core technical skills & clean structural layout`
        ]
      },
      {
        phase: "Phase 3 — Campus & Entry-Level Mock Interviews",
        duration: "1–2 weeks",
        tasks: [
          `Practice top 30 entry-level interview questions & core CS concepts`,
          `Complete adaptive mock interviews to build technical response confidence`,
          `Prepare self-introduction and behavioral STAR responses for campus/fresher drives`
        ]
      }
    ];

    recommendedTechnologies = Array.from(new Set([
      "Data Structures & Algorithms",
      "Git & GitHub",
      "SQL / Relational DBs",
      "Core CS (OS & DBMS)",
      ...missingSkills.slice(0, 2)
    ])).slice(0, 5);

    recommendedProjects = [
      {
        title: `${targetDomain} Interactive CRUD Application`,
        skills: [targetDomain, "REST APIs", "Git/GitHub", "SQL"],
        description: "Structured application demonstrating OOP principles, data persistence, and clean modular code.",
        why: "Demonstrates core CS fundamentals and version control readiness to campus recruiters."
      },
      {
        title: "Developer Portfolio & CLI Utility",
        skills: ["Git", "HTML/CSS/JS", "CLI", "Documentation"],
        description: "Interactive developer portfolio showcasing projects, GitHub activity, and a custom command-line tool.",
        why: "Establishes online presence and proves hands-on coding proficiency."
      }
    ];

    recommendedCertifications = [
      {
        title: "CS Fundamentals & Data Structures Certification",
        provider: "GeeksforGeeks / freeCodeCamp",
        isOptional: true
      },
      {
        title: `${targetDomain} Foundations Certificate`,
        provider: "Coursera / HackerRank",
        isOptional: true
      }
    ];

    interviewTopics = [
      { topic: "Data Structures & Algorithms", priority: "High" },
      { topic: "DBMS & SQL Queries", priority: "High" },
      { topic: "Operating Systems & Networking", priority: "Medium" },
      { topic: "Git & Version Control Workflow", priority: "Medium" },
      { topic: "Basic Object-Oriented Design", priority: "Low" },
      ...weakAreas.slice(0, 2).map((t) => ({ topic: t, priority: "High" }))
    ];
  }

  return {
    communicationGaps,
    roadmap,
    recommendedTechnologies,
    recommendedProjects,
    recommendedCertifications,
    interviewTopics,
  };
}

// ── 3. Main Calculate and Persist Engine Function ──────────────
async function generatePlacementReadiness(userId, targetDomainOverride, candidateTypeOverride, options = {}) {
  const { appendHistory = true } = options;

  // Calculate scores
  const scoreData = await calculateComponentScores(userId, targetDomainOverride, candidateTypeOverride);

  // Generate personalized recommendations
  const recs = await generateRecommendations({
    candidateType: scoreData.candidateType,
    targetDomain: scoreData.targetDomain,
    overallScore: scoreData.overallScore,
    components: scoreData.components,
    weakAreas: scoreData.weakAreas,
    missingSkills: scoreData.missingSkills,
    existingSkills: scoreData.existingSkills,
  });

  // Find existing document to update history
  let existingDoc = await PlacementReadiness.findOne({ userId });

  let historyList = existingDoc && Array.isArray(existingDoc.history) ? existingDoc.history : [];

  if (appendHistory) {
    const historySnapshot = {
      score: scoreData.overallScore,
      classification: scoreData.classification,
      componentScores: scoreData.components,
      weakAreas: scoreData.weakAreas,
      missingSkills: scoreData.missingSkills,
      generatedAt: new Date(),
    };
    historyList = [...historyList, historySnapshot];
  }

  const updatedDoc = await PlacementReadiness.findOneAndUpdate(
    { userId },
    {
      userId,
      currentScore: scoreData.overallScore,
      classification: scoreData.classification,
      candidateType: scoreData.candidateType,
      targetDomain: scoreData.targetDomain,
      components: scoreData.components,
      strongAreas: scoreData.strongAreas,
      weakAreas: scoreData.weakAreas,
      missingSkills: scoreData.missingSkills,
      communicationGaps: recs.communicationGaps || [],
      roadmap: recs.roadmap || [],
      recommendedTechnologies: recs.recommendedTechnologies || [],
      recommendedProjects: recs.recommendedProjects || [],
      recommendedCertifications: recs.recommendedCertifications || [],
      interviewTopics: recs.interviewTopics || [],
      history: historyList,
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return {
    readiness: updatedDoc,
    hasInterviews: scoreData.hasInterviews,
    hasResume: scoreData.hasResume,
  };
}

module.exports = {
  calculateComponentScores,
  generateRecommendations,
  generatePlacementReadiness,
};
