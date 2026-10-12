// Centralized Company Profiles Configuration for AI Recruiter Simulator

const COMPANY_PROFILES = {
  google: {
    key: "google",
    name: "Google",
    badgeLabel: "Google-Style Technical Round",
    description: "Focuses heavily on Data Structures & Algorithms, algorithmic complexity analysis, optimization, and scalable system thinking.",
    focusAreas: ["DSA & Algorithms", "Optimization", "Complexity Analysis", "System Thinking"],
    recommendedTopics: ["Advanced DSA & Graph Algorithms", "Big-O Time & Space Complexity", "Optimization & Edge-Case Analysis", "System Design Thinking"],
    interviewStyle: "Deep Technical & Algorithmic Reasoning",
    difficultyBias: "high",
    questionDistribution: {
      dsaProblemSolving: 50,
      technicalDepth: 20,
      systemDesign: 20,
      communication: 10,
    },
    evaluationWeights: {
      problemSolving: 0.35,
      technicalDepth: 0.30,
      optimization: 0.20,
      communication: 0.15,
    },
    promptInstructions: `Act as a Google Senior Software Engineer & Technical Recruiter.
- Frame questions requiring algorithmic problem solving, time/space complexity analysis (Big-O), and optimization.
- Ask follow-up questions challenging candidate's initial assumptions (e.g., "How would you optimize space to O(1)?", "How does this scale to 10M active queries?").
- Evaluate candidate on algorithmic rigor, correctness, efficiency, and clear technical communication.`,
  },

  amazon: {
    key: "amazon",
    name: "Amazon",
    badgeLabel: "Amazon Leadership & Tech Round",
    description: "Blends practical coding and Data Structures with Amazon Leadership Principles (Ownership, Bias for Action, Customer Obsession).",
    focusAreas: ["DSA & Problem Solving", "Behavioral & Leadership", "Ownership & Impact", "System Trade-offs"],
    recommendedTopics: ["DSA & Scenario Coding", "STAR Method Behavioral Responses", "Technical Ownership & Impact", "Scalable Service Trade-offs"],
    interviewStyle: "Leadership Principles & Practical Problem Solving",
    difficultyBias: "medium-high",
    questionDistribution: {
      dsaProblemSolving: 35,
      technicalDepth: 25,
      behavioralOwnership: 25,
      systemTradeoffs: 15,
    },
    evaluationWeights: {
      problemSolving: 0.30,
      behavioralOwnership: 0.30,
      technicalDepth: 0.25,
      communication: 0.15,
    },
    promptInstructions: `Act as an Amazon Bar Raiser & Senior Technical Recruiter.
- Blend technical coding/DSA questions with scenario-based behavioral questions probing Ownership, Customer Obsession, and Bias for Action.
- Ask candidates about past technical decisions under uncertainty, trade-offs made, and measurable outcomes.
- Evaluate candidate on technical competence, ownership mindset, customer focus, and STAR method clarity.`,
  },

  microsoft: {
    key: "microsoft",
    name: "Microsoft",
    badgeLabel: "Microsoft Engineering & Design Round",
    description: "Focuses on clean coding, practical debugging, problem solving, CS fundamentals, and software design principles.",
    focusAreas: ["Coding & Debugging", "Problem Solving", "Design Thinking", "CS Fundamentals"],
    recommendedTopics: ["Coding & Data Structures", "Debugging & Memory Profiling", "Software Design Patterns", "CS Core Fundamentals"],
    interviewStyle: "Practical Engineering & Code Quality",
    difficultyBias: "medium-high",
    questionDistribution: {
      codingProblemSolving: 35,
      debuggingCodeQuality: 25,
      technicalDepth: 25,
      csFundamentals: 15,
    },
    evaluationWeights: {
      problemSolving: 0.30,
      debugging: 0.30,
      technicalDepth: 0.25,
      communication: 0.15,
    },
    promptInstructions: `Act as a Microsoft Principal Software Engineer & Interviewer.
- Frame questions emphasizing practical coding, debugging complex edge cases, memory management, and solid Object-Oriented/Design patterns.
- Ask how candidates debug production bottlenecks, structure extensible classes/interfaces, and handle memory leaks.
- Evaluate candidate on problem-solving clarity, code structure, debugging intuition, and fundamental correctness.`,
  },

  tcs: {
    key: "tcs",
    name: "TCS",
    badgeLabel: "TCS Digital / Ninja Technical Round",
    description: "Prioritizes core CS fundamentals, OOP principles, DBMS/SQL, Operating Systems, Computer Networks, and basic programming.",
    focusAreas: ["Programming Fundamentals", "OOP Concepts", "DBMS & SQL", "OS & Networking", "Communication Clarity"],
    recommendedTopics: ["Core Programming Syntax (Java/C++/Python)", "OOP Principles & Inheritance", "DBMS & SQL Query Writing", "OS & Networking Fundamentals"],
    interviewStyle: "Foundational CS & Technical Basics",
    difficultyBias: "medium",
    questionDistribution: {
      programmingFundamentals: 25,
      oopConcepts: 20,
      dbmsSql: 20,
      osNetworks: 15,
      basicCoding: 10,
      communication: 10,
    },
    evaluationWeights: {
      fundamentals: 0.35,
      correctness: 0.30,
      communication: 0.20,
      problemSolving: 0.15,
    },
    promptInstructions: `Act as a TCS Technical Evaluator & Recruitment Lead.
- Ask clear questions covering Core CS subjects: Object-Oriented Programming (Java/C++/Python), DBMS/SQL queries, OS process scheduling, and Networking fundamentals.
- Keep questions accessible and foundational rather than overly complex system design.
- Evaluate candidate on fundamental clarity, precise terminology, logical correctness, and clear verbal presentation.`,
  },

  infosys: {
    key: "infosys",
    name: "Infosys",
    badgeLabel: "Infosys Specialist / Technical Round",
    description: "Focuses on programming logic, Java/OOP, SQL queries, database fundamentals, basic DSA, and project understanding.",
    focusAreas: ["Core Java & OOP", "SQL & Database Schema", "Basic DSA", "Project Understanding"],
    recommendedTopics: ["Java / OOP Mechanics", "SQL Joins & Indexing", "Basic Data Structures", "Project Architecture & Role Walkthrough"],
    interviewStyle: "Core Tech Basics & Project Review",
    difficultyBias: "medium",
    questionDistribution: {
      fundamentals: 30,
      javaOop: 25,
      sqlDbms: 25,
      projectDiscussion: 20,
    },
    evaluationWeights: {
      fundamentals: 0.35,
      projectUnderstanding: 0.25,
      correctness: 0.25,
      communication: 0.15,
    },
    promptInstructions: `Act as an Infosys Lead Technical Interviewer.
- Focus questions on Java/OOP concepts, SQL queries (joins, indexing, aggregation), basic data structures (arrays, lists, stacks), and candidate's project architecture.
- Ask candidate to explain their project role, database design, and key components.
- Evaluate on fundamental concepts, project depth, SQL fluency, and structured responses.`,
  },

  startup: {
    key: "startup",
    name: "Startup",
    badgeLabel: "Fast-Paced Startup Tech Round",
    description: "Focuses on real-world practical development, API integration, debugging, database performance, architecture choices, and ownership.",
    focusAreas: ["Real-World Problem Solving", "REST/GraphQL APIs", "Debugging & Reliability", "Architecture & Trade-offs", "Ownership"],
    recommendedTopics: ["REST & GraphQL APIs", "Production Debugging & Logs", "Deployment & CI/CD Pipelines", "Database Latency & Architecture Trade-offs"],
    interviewStyle: "Pragmatic Full-Stack & Systems",
    difficultyBias: "medium-high",
    questionDistribution: {
      practicalDevDebugging: 35,
      apiArchitecture: 30,
      ownershipExecution: 20,
      communication: 15,
    },
    evaluationWeights: {
      practicalReasoning: 0.35,
      architectureApis: 0.30,
      ownership: 0.20,
      communication: 0.15,
    },
    promptInstructions: `Act as a Startup CTO & Tech Lead.
- Ask pragmatic, production-focused questions: handling API rate limits, debugging memory leaks in Node/React, handling database latency spikes, and choosing trade-offs.
- Ask candidate how they would build, deploy, and scale features quickly under tight deadlines.
- Evaluate on practical problem solving, architectural pragmatism, debugging intuition, and shipping mindset.`,
  },

  product_based: {
    key: "product_based",
    name: "Product-Based Company",
    badgeLabel: "Tier-1 Product Company Round",
    description: "Focuses on Data Structures, System Design, performance optimization, scalability, and deep technical reasoning.",
    focusAreas: ["DSA & Optimization", "System Design & Scale", "Performance Tuning", "Technical Depth"],
    recommendedTopics: ["High-Scale System Design", "Distributed Caching (Redis/Kafka)", "Advanced DSA Optimization", "Scalability & Bottleneck Analysis"],
    interviewStyle: "High-Scale Architecture & Algorithmic Rigor",
    difficultyBias: "high",
    questionDistribution: {
      systemDesignScale: 35,
      dsaProblemSolving: 30,
      optimization: 20,
      communication: 15,
    },
    evaluationWeights: {
      systemDesign: 0.35,
      problemSolving: 0.30,
      optimization: 0.20,
      communication: 0.15,
    },
    promptInstructions: `Act as a Lead Architect & Staff Engineer at a top product-based company.
- Focus on high-throughput system design, distributed caching, database sharding, algorithmic optimization, and scalability bottlenecks.
- Challenge candidate to optimize time/space complexity and explain architectural failure modes under high load.
- Evaluate on system thinking, algorithmic depth, optimization awareness, and technical excellence.`,
  },

  general: {
    key: "general",
    name: "General / Standard",
    badgeLabel: "Adaptive Technical Round",
    description: "Standard adaptive interview tailored dynamically based on selected role and domain topics.",
    focusAreas: ["Domain Concepts", "Problem Solving", "Code Quality", "Communication"],
    recommendedTopics: ["Technical Problem Solving", "Code Quality & Testing", "Communication & Structure"],
    interviewStyle: "Standard Adaptive Assessment",
    difficultyBias: "medium",
    questionDistribution: {
      technicalDepth: 40,
      problemSolving: 35,
      communication: 25,
    },
    evaluationWeights: {
      technicalDepth: 0.40,
      problemSolving: 0.35,
      communication: 0.25,
    },
    promptInstructions: `Act as an expert technical interviewer conducting a balanced, adaptive interview.`,
  },
};

function isValidCompanyKey(keyOrName) {
  if (!keyOrName) return false;
  const lower = String(keyOrName).toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  if (COMPANY_PROFILES[lower]) return true;
  for (const prof of Object.values(COMPANY_PROFILES)) {
    if (prof.name.toLowerCase().replace(/[^a-z0-9]/g, "") === lower) {
      return true;
    }
  }
  return false;
}

function getCompanyProfile(keyOrName) {
  if (!keyOrName) return COMPANY_PROFILES.general;
  const lower = String(keyOrName).toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  
  for (const [k, prof] of Object.entries(COMPANY_PROFILES)) {
    if (k === lower || prof.name.toLowerCase().replace(/[^a-z0-9]/g, "") === lower) {
      return prof;
    }
  }
  
  if (lower.includes("google")) return COMPANY_PROFILES.google;
  if (lower.includes("amazon")) return COMPANY_PROFILES.amazon;
  if (lower.includes("microsoft")) return COMPANY_PROFILES.microsoft;
  if (lower.includes("tcs")) return COMPANY_PROFILES.tcs;
  if (lower.includes("infosys")) return COMPANY_PROFILES.infosys;
  if (lower.includes("startup")) return COMPANY_PROFILES.startup;
  if (lower.includes("product")) return COMPANY_PROFILES.product_based;

  return COMPANY_PROFILES.general;
}

function calculateExpectationMatch(companyProfileKey, overallScore) {
  const prof = getCompanyProfile(companyProfileKey);
  const minReady = prof.difficultyBias === "high" ? 75 : prof.difficultyBias === "medium-high" ? 70 : 65;
  const minClose = minReady - 15;

  if (overallScore >= minReady) {
    return "Meets Simulated Expectations";
  } else if (overallScore >= minClose) {
    return "Close to Expected Level";
  }
  return "Needs More Preparation";
}

function generateCompanyFeedback(companyProfileKey, overallScore) {
  const key = String(companyProfileKey || "general").toLowerCase();

  if (key.includes("google")) {
    if (overallScore >= 80) return "Your algorithmic reasoning and problem-solving were strong. You demonstrated solid optimization and complexity awareness expected for simulated Google technical interviews.";
    if (overallScore >= 60) return "Your fundamentals and reasoning were strong, but optimization and edge-case analysis need improvement for this simulated interview profile.";
    return "Focus on deepening your DSA fundamentals, Big-O complexity analysis, and edge-case validation to meet simulated Google technical expectations.";
  }
  if (key.includes("amazon")) {
    if (overallScore >= 80) return "Strong technical performance and clear ownership demonstrated across scenarios, matching Amazon's Leadership Principles.";
    if (overallScore >= 60) return "Technical performance was solid, but behavioral answers should include clearer ownership, actions, and measurable outcomes.";
    return "Prepare structured STAR method answers highlighting direct technical ownership and practice scenario-based problem solving.";
  }
  if (key.includes("microsoft")) {
    if (overallScore >= 80) return "Excellent code quality, debugging logic, and fundamental understanding matching Microsoft engineering standards.";
    if (overallScore >= 60) return "Solid overall technical understanding, but deeper debugging intuition and edge-case coverage will improve your profile match.";
    return "Focus on strengthening core programming syntax, memory/scope debugging, and Object-Oriented design principles.";
  }
  if (key.includes("tcs")) {
    if (overallScore >= 80) return "Outstanding clarity in core CS subjects, OOP principles, and fundamental programming concepts.";
    if (overallScore >= 60) return "Good grasp of fundamental concepts; work on precise technical definitions and basic SQL query execution.";
    return "Review core CS basics (OOP inheritance, DBMS keys, OS process states, and computer networking).";
  }
  if (key.includes("infosys")) {
    if (overallScore >= 80) return "Great technical clarity across OOP, database queries, and structured project walkthroughs.";
    if (overallScore >= 60) return "Solid foundational knowledge, but explain your personal project contributions and SQL joins in greater detail.";
    return "Practice explaining your project architecture step-by-step alongside core Java/OOP and SQL basics.";
  }
  if (key.includes("startup")) {
    if (overallScore >= 80) return "Pragmatic problem solving, fast debugging intuition, and practical architecture awareness demonstrated.";
    if (overallScore >= 60) return "Your practical implementation knowledge is good, but deployment, debugging, and architecture trade-offs need deeper explanation.";
    return "Focus on practical full-stack development, API integration patterns, debugging production issues, and deployment pipelines.";
  }
  if (key.includes("product")) {
    if (overallScore >= 80) return "Impressive system thinking, scalability awareness, and algorithmic optimization matching tier-1 product standards.";
    if (overallScore >= 60) return "Good algorithmic depth; focus on explaining system trade-offs, caching strategies, and high-throughput bottlenecks.";
    return "Deepen your knowledge in system design principles, load balancing, database sharding, and algorithmic time complexity.";
  }
  return overallScore >= 60
    ? "Consistent overall interview performance with clear communication across foundational topics."
    : "Focus on structured problem solving and technical depth in core domain concepts.";
}

function getAllCompanyProfiles() {
  return Object.values(COMPANY_PROFILES);
}

module.exports = {
  COMPANY_PROFILES,
  isValidCompanyKey,
  getCompanyProfile,
  calculateExpectationMatch,
  generateCompanyFeedback,
  getAllCompanyProfiles,
};
