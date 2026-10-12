const Groq = require("groq-sdk");
const pdfjslib=require("pdfjs-dist/legacy/build/pdf.js");

const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
};


const DOMAINS = [
  "JavaScript/Node.js",
  "React",
  "Python",
  "Data Science",
  "DevOps",
  "System Design",
  "Database Design",
  "General",
];
async function extractTextFromPDF(buffer) {
  try {
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjslib.getDocument({
      data: uint8Array,
      verbosity: 0, // Suppress font/TT warnings from PDF.js
    });
    const pdf = await loadingTask.promise;
    let textContent = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item) => item.str);
      textContent += strings.join(" ") + "\n";
    }
    return textContent;
  } catch (err) {
    console.error("[PDF Extraction Error]:", err.message);
    return "";
  }
}

function fallbackAnalyzeResume(resumeText) {
  const lower = resumeText.toLowerCase();

  const allTechSkills = [
    "JavaScript", "Node.js", "Express", "React", "HTML", "CSS", "TypeScript",
    "Python", "Django", "Flask", "Pandas", "NumPy", "Scikit-Learn",
    "Docker", "Kubernetes", "CI/CD", "AWS", "Linux",
    "SQL", "MongoDB", "PostgreSQL", "MySQL", "Redis",
    "Git", "REST APIs", "System Design", "OOP", "Data Structures"
  ];

  const skillsDetected = allTechSkills.filter((s) => lower.includes(s.toLowerCase()));
  if (skillsDetected.length === 0) {
    skillsDetected.push("Software Engineering", "Problem Solving", "Git");
  }

  let experienceLevel = "Junior";
  if (lower.includes("senior") || lower.includes("lead") || lower.includes("architect") || lower.includes("5+ years") || lower.includes("8+ years")) {
    experienceLevel = "Senior";
  } else if (lower.includes("mid") || lower.includes("3+ years") || lower.includes("4+ years") || lower.includes("experienced")) {
    experienceLevel = "Mid";
  }

  const domainScores = {
    "React": ["react", "html", "css", "javascript", "frontend", "hooks"].filter((kw) => lower.includes(kw)).length,
    "JavaScript/Node.js": ["node", "express", "javascript", "backend", "npm"].filter((kw) => lower.includes(kw)).length,
    "Python": ["python", "django", "flask"].filter((kw) => lower.includes(kw)).length,
    "Data Science": ["pandas", "numpy", "machine learning", "scikit", "data science"].filter((kw) => lower.includes(kw)).length,
    "DevOps": ["docker", "kubernetes", "aws", "ci/cd", "devops", "linux"].filter((kw) => lower.includes(kw)).length,
    "Database Design": ["sql", "mongodb", "postgresql", "database", "mysql"].filter((kw) => lower.includes(kw)).length,
    "System Design": ["system design", "distributed", "scalability", "microservices"].filter((kw) => lower.includes(kw)).length,
    "General": 1
  };

  const sortedDomains = Object.keys(domainScores)
    .sort((a, b) => domainScores[b] - domainScores[a])
    .slice(0, 3)
    .map((label, idx) => ({
      label,
      reason: `Matches your detected technical background in ${label}.`,
      confidence: Math.max(60, 90 - idx * 10)
    }));

  return {
    summary: `Candidate profile demonstrating technical skills in ${skillsDetected.slice(0, 4).join(", ") || "software development"}.`,
    experienceLevel,
    skillsDetected: skillsDetected.slice(0, 12),
    strengths: ["Technical Proficiency", "Problem Solving", "Domain Focus"],
    recommendedDomains: sortedDomains,
  };
}

const analyzeResume = async (req, res) => {
  console.log("=== [RESUME ANALYZE REQUEST RECEIVED] ===");
  console.log("Content-Type:", req.headers["content-type"]);
  console.log("req.body:", req.body);
  console.log("req.file present:", !!req.file);

  if (req.file) {
    console.log("File Mimetype:", req.file.mimetype);
    console.log("File Size:", req.file.size, "bytes");
    console.log("File OriginalName:", req.file.originalname);
  }

  try {
    if (!req.file) {
      console.warn("Validation Branch 400: No req.file received");
      return res.status(400).json({
        message: "No resume file received. Please upload a PDF, DOC, or TXT file.",
        error: "No resume file received. Please upload a PDF, DOC, or TXT file."
      });
    }

    let resumeText = "";
    if (req.file.mimetype === "application/pdf") {
      resumeText = await extractTextFromPDF(req.file.buffer);
    } else {
      resumeText = req.file.buffer.toString("utf-8");
    }

    console.log("Extracted Text Length:", resumeText ? resumeText.length : 0);

    if (!resumeText || resumeText.trim().length < 30) {
      console.warn("Validation Branch 400: Extracted text length < 30");
      return res.status(400).json({
        message: "Could not extract readable text from the uploaded file. Please ensure it contains selectable text.",
        error: "Could not extract readable text from the uploaded file. Please ensure it contains selectable text."
      });
    }

    const truncated = resumeText.slice(0, 6000);
    let analysis = null;

    const groq = getGroqClient();
    if (groq) {
      try {
        const prompt = `
You are an expert technical recruiter and career coach.
Analyze the following resume and respond ONLY with a valid JSON object. No text outside JSON.

Available interview domains: ${DOMAINS.join(", ")}

Resume text:
"""
${truncated}
"""

Respond with this exact JSON structure:
{
  "summary": "2-3 sentence professional summary of the candidate",
  "experienceLevel": "Junior" | "Mid" | "Senior",
  "skillsDetected": ["skill1", "skill2", "skill3"],
  "strengths": ["strength1", "strength2", "strength3"],
  "recommendedDomains": [
    {
      "label": "exact domain name from the available list",
      "reason": "one sentence why this domain fits them",
      "confidence": 85
    }
  ]
}
`.trim();

        const response = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
        });

        const raw = response.choices[0].message.content || "{}";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      } catch (err) {
        console.warn("Groq resume analysis failed, using fallback:", err.message);
      }
    }

    // Fallback if Groq unavailable or returned invalid JSON
    if (!analysis) {
      console.log("Using deterministic fallback resume analyzer...");
      analysis = fallbackAnalyzeResume(resumeText);
    }

    const validDomains = DOMAINS;
    if (analysis && analysis.recommendedDomains) {
      analysis.recommendedDomains = analysis.recommendedDomains.filter((d) =>
        validDomains.includes(d.label)
      );
    }

    // Save/update user's Resume document in MongoDB
    if (req.userId && analysis) {
      const Resume = require("../models/Resume.js");
      await Resume.findOneAndUpdate(
        { userId: req.userId },
        {
          userId: req.userId,
          resumeText: truncated,
          summary: analysis.summary || "",
          experienceLevel: analysis.experienceLevel || "Junior",
          skillsDetected: Array.isArray(analysis.skillsDetected) ? analysis.skillsDetected : [],
          strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
          recommendedDomains: Array.isArray(analysis.recommendedDomains) ? analysis.recommendedDomains : [],
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      // Automatically recalculate Placement Readiness with latest resume data
      try {
        const { generatePlacementReadiness } = require("../services/readinessEngine.js");
        const readinessResult = await generatePlacementReadiness(req.userId);
        console.log("Placement Readiness automatically updated post-resume analysis for user:", req.userId);
        return res.json({ analysis, readiness: readinessResult.readiness });
      } catch (e) {
        console.warn("Readiness update post-resume error:", e.message);
      }
    }

    console.log("Resume analysis completed successfully!");
    res.json({ analysis });
  } catch (error) {
    console.error("Full caught error in analyzeResume:", error.message);
    console.error(error.stack);
    res.status(500).json({
      message: `Failed to analyze resume: ${error.message}`,
      error: error.message
    });
  }
};

const getLatestResume = async (req, res) => {
    try {
        const Resume = require("../models/Resume.js");
        const resume = await Resume.findOne({ userId: req.userId });
        if (!resume) {
            return res.json({ resume: null });
        }
        res.json({
            resume: {
                summary: resume.summary,
                experienceLevel: resume.experienceLevel,
                skillsDetected: resume.skillsDetected,
                strengths: resume.strengths,
                recommendedDomains: resume.recommendedDomains,
                updatedAt: resume.updatedAt,
            }
        });
    } catch (error) {
        console.error("Error fetching latest resume:", error);
        res.status(500).json({ error: "Failed to fetch resume" });
    }
};

module.exports = {
    analyzeResume,
    getLatestResume,
};
