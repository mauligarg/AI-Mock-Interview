// ── Central Placement Readiness Configuration ───────────────────

const readinessWeights = {
  interviewPerformance: 0.40,
  resumeStrength: 0.25,
  skillMatch: 0.20,
  communication: 0.15,
};

const readinessThresholds = {
  needsImprovementMax: 49,
  highPotentialMax: 74,
  placementReadyMin: 75,
};

const CLASSIFICATIONS = {
  NEEDS_IMPROVEMENT: "Needs Improvement",
  HIGH_POTENTIAL: "High Potential Candidate",
  PLACEMENT_READY: "Placement Ready",
};

const CANDIDATE_TYPES = {
  FRESHER: "Fresher",
  INTERNSHIP_SEEKER: "Internship Seeker",
  EXPERIENCED: "Experienced Candidate",
};

// Expected core skills per domain for skill match calculation
const DOMAIN_SKILL_EXPECTATIONS = {
  React: [
    "HTML", "CSS", "JavaScript", "ES6+", "React", "React Hooks",
    "State Management", "Context API", "REST APIs", "Git",
    "Performance Optimization", "TypeScript"
  ],
  "JavaScript/Node.js": [
    "JavaScript", "ES6+", "Node.js", "Express.js", "Async/Await",
    "Promises", "Event Loop", "REST APIs", "MongoDB", "SQL",
    "Authentication", "Git", "JWT"
  ],
  Python: [
    "Python", "OOP", "Data Structures", "Algorithms", "Django/Flask",
    "REST APIs", "SQL", "Git", "Unit Testing"
  ],
  "Data Science": [
    "Python", "Pandas", "NumPy", "Scikit-Learn", "Machine Learning",
    "SQL", "Data Visualization", "Statistics", "Git", "Jupyter"
  ],
  DevOps: [
    "Linux", "Bash/Shell", "Git", "Docker", "Kubernetes",
    "CI/CD", "AWS/Cloud", "Terraform", "Monitoring", "Networking"
  ],
  "System Design": [
    "Distributed Systems", "Caching/Redis", "Load Balancing",
    "Microservices", "Database Sharding", "Message Queues", "REST/gRPC",
    "Scalability", "System Architecture"
  ],
  "Database Design": [
    "SQL", "NoSQL", "Database Indexing", "B-Trees", "Schema Design",
    "ACID Properties", "Transactions", "MongoDB", "PostgreSQL/MySQL", "Query Optimization"
  ],
  General: [
    "Data Structures", "Algorithms", "OOP Principles", "Problem Solving",
    "Git", "REST APIs", "SQL Basics", "System Fundamentals"
  ]
};

function getClassification(score) {
  if (score >= readinessThresholds.placementReadyMin) {
    return CLASSIFICATIONS.PLACEMENT_READY;
  } else if (score >= 50) {
    return CLASSIFICATIONS.HIGH_POTENTIAL;
  }
  return CLASSIFICATIONS.NEEDS_IMPROVEMENT;
}

module.exports = {
  readinessWeights,
  readinessThresholds,
  CLASSIFICATIONS,
  CANDIDATE_TYPES,
  DOMAIN_SKILL_EXPECTATIONS,
  getClassification,
};
