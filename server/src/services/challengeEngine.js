const Challenge = require("../models/Challenge");
const { getCompanyProfile } = require("../config/companyProfiles");

// ── Text Normalization & Duplicate Matching Engine ────────────
function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCoreKeywords(text) {
  const stopWords = new Set([
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with",
    "he", "as", "you", "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her",
    "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up",
    "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time",
    "no", "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could",
    "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think",
    "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even",
    "new", "want", "because", "any", "these", "give", "day", "most", "us", "is", "are", "was", "were",
    "explain", "describe", "detail", "write", "difference", "between", "versus", "vs", "compare"
  ]);

  const words = normalizeText(text).split(" ").filter((w) => w.length > 2 && !stopWords.has(w));
  return new Set(words);
}

function computeSimilarity(s1, s2) {
  const n1 = normalizeText(s1);
  const n2 = normalizeText(s2);
  if (n1 === n2) return 1.0;
  if (!n1 || !n2) return 0.0;

  const kw1 = getCoreKeywords(n1);
  const kw2 = getCoreKeywords(n2);
  if (kw1.size === 0 || kw2.size === 0) return 0.0;

  let intersection = 0;
  for (const w of kw1) {
    if (kw2.has(w)) intersection++;
  }

  const union = new Set([...kw1, ...kw2]).size;
  const jaccard = intersection / union;

  // Levenshtein similarity fallback
  const len1 = n1.length;
  const len2 = n2.length;
  const matrix = Array.from({ length: len1 + 1 }, () => new Array(len2 + 1).fill(0));
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = n1[i - 1] === n2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const levSim = 1.0 - matrix[len1][len2] / Math.max(len1, len2);
  return Math.max(jaccard, levSim);
}

function isDuplicateChallengeQuestion(existingQuestions, candidateQuestion) {
  const candText = candidateQuestion.questionText || candidateQuestion.text || "";
  const candNorm = normalizeText(candText);

  for (const existing of existingQuestions) {
    const exText = existing.questionText || existing.text || "";
    const exNorm = normalizeText(exText);

    // 1. Exact text match
    if (candNorm === exNorm) return true;

    // 2. High Similarity match (> 0.65 threshold)
    if (computeSimilarity(candText, exText) > 0.65) return true;

    // 3. For MCQs: Check if options text set matches (even if reordered)
    if (
      candidateQuestion.type === "mcq" &&
      existing.type === "mcq" &&
      candidateQuestion.options &&
      existing.options
    ) {
      const candOpts = new Set(candidateQuestion.options.map((o) => normalizeText(o.optionText || o)));
      const exOpts = new Set(existing.options.map((o) => normalizeText(o.optionText || o)));
      let optMatches = 0;
      for (const opt of candOpts) {
        if (exOpts.has(opt)) optMatches++;
      }
      if (candOpts.size > 0 && optMatches / candOpts.size >= 0.75) {
        return true;
      }
    }
  }

  return false;
}

// ── HR Question Pool (15 Unique Items) ────────────────────────
const HR_QUESTIONS = [
  { questionId: "hr_1", questionText: "Tell me about yourself and why you are interested in this software engineering role.", topic: "Introduction & Background", type: "subjective", difficulty: 1 },
  { questionId: "hr_2", questionText: "Describe a situation where you had a major disagreement with a team member. How did you handle it and what was the outcome?", topic: "Conflict Handling", type: "subjective", difficulty: 2 },
  { questionId: "hr_3", questionText: "What are your top 2 technical strengths and 1 area of improvement? How are you actively working on your weakness?", topic: "Self Awareness", type: "subjective", difficulty: 1 },
  { questionId: "hr_4", questionText: "Describe a project where you took the lead or demonstrated ownership under tight deadlines. What trade-offs did you make?", topic: "Leadership & Ownership", type: "subjective", difficulty: 2 },
  { questionId: "hr_5", questionText: "Give an example of a time when a project or feature failed to meet expectations. What did you learn and how did you adapt?", topic: "Resilience & Growth", type: "subjective", difficulty: 2 },
  { questionId: "hr_6", questionText: "How do you prioritize competing tasks when multiple high-priority tickets are assigned to you simultaneously?", topic: "Time Management", type: "subjective", difficulty: 1 },
  { questionId: "hr_7", questionText: "Describe a scenario where you had to learn a complex new framework or technology quickly to deliver a critical production feature.", topic: "Adaptability & Learning", type: "subjective", difficulty: 2 },
  { questionId: "hr_8", questionText: "How do you handle critical feedback or code review pushback from senior peers?", topic: "Feedback & Communication", type: "subjective", difficulty: 1 },
  { questionId: "hr_9", questionText: "Tell me about a time you had to explain a complex technical system architecture to a non-technical client or executive.", topic: "Technical Communication", type: "subjective", difficulty: 2 },
  { questionId: "hr_10", questionText: "What work environment and team engineering culture allows you to perform at your personal best?", topic: "Culture Fit", type: "subjective", difficulty: 1 },
  { questionId: "hr_11", questionText: "Describe a situation where you identified a performance bottleneck or security vulnerability in existing code and took initiative to fix it.", topic: "Proactive Ownership", type: "subjective", difficulty: 2 },
  { questionId: "hr_12", questionText: "How do you maintain work-life balance and focus during high-stress product release cycles?", topic: "Stress Management", type: "subjective", difficulty: 1 },
  { questionId: "hr_13", questionText: "Tell me about a time you mentored or helped onboard a junior engineer or classmate get up to speed.", topic: "Mentorship", type: "subjective", difficulty: 2 },
  { questionId: "hr_14", questionText: "What would you do if you realized 2 days before a major production release that a core business requirement was misunderstood?", topic: "Risk Mitigation", type: "subjective", difficulty: 3 },
  { questionId: "hr_15", questionText: "Where do you see your technical specialization evolving over the next 3 to 5 years?", topic: "Career Vision", type: "subjective", difficulty: 1 },
];

// ── Aptitude MCQ Pool (20 Unique Items) ───────────────────────
const APTITUDE_QUESTIONS = [
  {
    questionId: "apt_1",
    questionText: "If 12 workers can complete a project in 15 days, how many days will it take 18 workers to complete the same project working at the same pace?",
    type: "mcq", topic: "Time and Work", difficulty: 1,
    options: [{ optionId: "A", optionText: "8 days" }, { optionId: "B", optionText: "10 days" }, { optionId: "C", optionText: "12 days" }, { optionId: "D", optionText: "14 days" }],
    correctOptionId: "B", explanation: "Inverse proportion: 12 * 15 = 18 * Days => Days = 180 / 18 = 10 days.",
  },
  {
    questionId: "apt_2",
    questionText: "A train 150 meters long passes a telegraph pole in 10 seconds. What is the speed of the train in km/h?",
    type: "mcq", topic: "Speed & Distance", difficulty: 1,
    options: [{ optionId: "A", optionText: "48 km/h" }, { optionId: "B", optionText: "54 km/h" }, { optionId: "C", optionText: "60 km/h" }, { optionId: "D", optionText: "72 km/h" }],
    correctOptionId: "B", explanation: "Speed in m/s = 150m / 10s = 15 m/s. Speed in km/h = 15 * (18/5) = 54 km/h.",
  },
  {
    questionId: "apt_3",
    questionText: "Find the next number in the logical sequence: 3, 7, 15, 31, 63, ___?",
    type: "mcq", topic: "Number Sequences", difficulty: 1,
    options: [{ optionId: "A", optionText: "127" }, { optionId: "B", optionText: "125" }, { optionId: "C", optionText: "128" }, { optionId: "D", optionText: "126" }],
    correctOptionId: "A", explanation: "Pattern is (N * 2) + 1. (63 * 2) + 1 = 127.",
  },
  {
    questionId: "apt_4",
    questionText: "A bag contains 5 Red balls and 3 Blue balls. If 2 balls are drawn at random without replacement, what is the probability that both are Red?",
    type: "mcq", topic: "Probability", difficulty: 2,
    options: [{ optionId: "A", optionText: "5 / 14" }, { optionId: "B", optionText: "15 / 56" }, { optionId: "C", optionText: "5 / 28" }, { optionId: "D", optionText: "3 / 8" }],
    correctOptionId: "A", explanation: "Probability = (5/8) * (4/7) = 20 / 56 = 5 / 14.",
  },
  {
    questionId: "apt_5",
    questionText: "If the price of a commodity increases by 25%, by what percentage must a consumer reduce consumption to keep expenditure constant?",
    type: "mcq", topic: "Percentages", difficulty: 2,
    options: [{ optionId: "A", optionText: "15%" }, { optionId: "B", optionText: "20%" }, { optionId: "C", optionText: "25%" }, { optionId: "D", optionText: "30%" }],
    correctOptionId: "B", explanation: "Reduction = [R / (100 + R)] * 100 = [25 / 125] * 100 = 20%.",
  },
  {
    questionId: "apt_6",
    questionText: "Pointing to a photograph, Rohan said: 'She is the daughter of my grandfather's only son.' How is the person in the photograph related to Rohan?",
    type: "mcq", topic: "Logical Reasoning", difficulty: 1,
    options: [{ optionId: "A", optionText: "Mother" }, { optionId: "B", optionText: "Sister" }, { optionId: "C", optionText: "Aunt" }, { optionId: "D", optionText: "Cousin" }],
    correctOptionId: "B", explanation: "Grandfather's only son is Rohan's father. Father's daughter is Rohan's sister.",
  },
  {
    questionId: "apt_7",
    questionText: "A merchant buys an item for $80 and sells it for $100. What is the profit percentage?",
    type: "mcq", topic: "Profit & Loss", difficulty: 1,
    options: [{ optionId: "A", optionText: "20%" }, { optionId: "B", optionText: "25%" }, { optionId: "C", optionText: "30%" }, { optionId: "D", optionText: "15%" }],
    correctOptionId: "B", explanation: "Profit = 20. Profit % = (20/80) * 100 = 25%.",
  },
  {
    questionId: "apt_8",
    questionText: "If ratio A:B = 2:3 and B:C = 4:5, what is the ratio A:C?",
    type: "mcq", topic: "Ratios & Proportions", difficulty: 1,
    options: [{ optionId: "A", optionText: "8 : 15" }, { optionId: "B", optionText: "6 : 15" }, { optionId: "C", optionText: "2 : 5" }, { optionId: "D", optionText: "4 : 5" }],
    correctOptionId: "A", explanation: "A/C = (A/B) * (B/C) = (2/3) * (4/5) = 8/15.",
  },
  {
    questionId: "apt_9",
    questionText: "A father is 3 times as old as his son. In 12 years, his age will be twice the age of his son. How old is the son now?",
    type: "mcq", topic: "Ages & Reasoning", difficulty: 2,
    options: [{ optionId: "A", optionText: "10 years" }, { optionId: "B", optionText: "12 years" }, { optionId: "C", optionText: "14 years" }, { optionId: "D", optionText: "15 years" }],
    correctOptionId: "B", explanation: "3S + 12 = 2(S + 12) => S = 12 years.",
  },
  {
    questionId: "apt_10",
    questionText: "In how many different ways can the 5 letters of the word 'LOGIC' be arranged?",
    type: "mcq", topic: "Permutations", difficulty: 1,
    options: [{ optionId: "A", optionText: "60" }, { optionId: "B", optionText: "120" }, { optionId: "C", optionText: "240" }, { optionId: "D", optionText: "100" }],
    correctOptionId: "B", explanation: "5! = 5 * 4 * 3 * 2 * 1 = 120 ways.",
  },
  {
    questionId: "apt_11",
    questionText: "Pipe A fills a tank in 4 hours while Pipe B empties it in 6 hours. If both pipes are opened together, how long to fill the empty tank?",
    type: "mcq", topic: "Pipes & Cisterns", difficulty: 2,
    options: [{ optionId: "A", optionText: "10 hours" }, { optionId: "B", optionText: "12 hours" }, { optionId: "C", optionText: "8 hours" }, { optionId: "D", optionText: "14 hours" }],
    correctOptionId: "B", explanation: "Net rate = (1/4) - (1/6) = 1/12. Time = 12 hours.",
  },
  {
    questionId: "apt_12",
    questionText: "The average score of 5 students is 80. If a 6th student's score of 100 is included, what is the new overall average?",
    type: "mcq", topic: "Averages", difficulty: 1,
    options: [{ optionId: "A", optionText: "82.5" }, { optionId: "B", optionText: "83.33" }, { optionId: "C", optionText: "85.0" }, { optionId: "D", optionText: "84.5" }],
    correctOptionId: "B", explanation: "New sum = 400 + 100 = 500. New average = 500 / 6 = 83.33.",
  },
  {
    questionId: "apt_13",
    questionText: "What is the simple interest earned on a principal of $1,000 at 5% annual interest rate over 3 years?",
    type: "mcq", topic: "Simple Interest", difficulty: 1,
    options: [{ optionId: "A", optionText: "$120" }, { optionId: "B", optionText: "$150" }, { optionId: "C", optionText: "$180" }, { optionId: "D", optionText: "$200" }],
    correctOptionId: "B", explanation: "SI = (P * R * T)/100 = (1000 * 5 * 3)/100 = $150.",
  },
  {
    questionId: "apt_14",
    questionText: "Find the missing term in the sequence: 2, 6, 12, 20, 30, ___?",
    type: "mcq", topic: "Number Patterns", difficulty: 2,
    options: [{ optionId: "A", optionText: "40" }, { optionId: "B", optionText: "42" }, { optionId: "C", optionText: "44" }, { optionId: "D", optionText: "38" }],
    correctOptionId: "B", explanation: "Differences are 4, 6, 8, 10, next is +12 => 30 + 12 = 42.",
  },
  {
    questionId: "apt_15",
    questionText: "If the word 'CAT' is coded as '3120', how is the word 'DOG' coded using the same letter position rule?",
    type: "mcq", topic: "Coding-Decoding", difficulty: 1,
    options: [{ optionId: "A", optionText: "4157" }, { optionId: "B", optionText: "4158" }, { optionId: "C", optionText: "3147" }, { optionId: "D", optionText: "4147" }],
    correctOptionId: "A", explanation: "D=4, O=15, G=7 => 4157.",
  },
];

// ── Technical Question Pool (25 Unique Items) ─────────────────
const TECHNICAL_QUESTIONS = [
  { questionId: "tech_1", questionText: "What are the four core principles of Object-Oriented Programming (OOP)? Explain how Abstraction differs from Encapsulation.", type: "subjective", topic: "OOP Concepts", difficulty: 1 },
  { questionId: "tech_2", questionText: "Explain how the JavaScript Event Loop manages the Microtask Queue vs Macrotask Queue during asynchronous execution.", type: "subjective", topic: "JavaScript Runtime", difficulty: 2 },
  { questionId: "tech_3", questionText: "What is database indexing? Explain how B-Tree indexes speed up SELECT query execution times and their write trade-offs.", type: "subjective", topic: "DBMS & Databases", difficulty: 2 },
  { questionId: "tech_4", questionText: "Explain the difference between a Process and a Thread in Operating Systems. What occurs during a context switch?", type: "subjective", topic: "Operating Systems", difficulty: 1 },
  { questionId: "tech_5", questionText: "How does the TCP 3-Way Handshake establish a reliable connection between client and server?", type: "subjective", topic: "Computer Networks", difficulty: 2 },
  { questionId: "tech_6", questionText: "Explain Binary Search algorithm time complexity O(log N) and describe edge cases like duplicate elements or empty arrays.", type: "subjective", topic: "DSA & Algorithms", difficulty: 2 },
  { questionId: "tech_7", questionText: "How does React Reconciliation and Fiber Architecture optimize DOM updates under the hood?", type: "subjective", topic: "React Framework", difficulty: 3 },
  { questionId: "tech_8", questionText: "What is the difference between RESTful APIs and GraphQL? Compare performance, over-fetching, and caching.", type: "subjective", topic: "API Architecture", difficulty: 2 },
  { questionId: "tech_9", questionText: "Explain how Redis distributed caching handles cache stampede and cache penetration scenarios.", type: "subjective", topic: "Caching & Systems", difficulty: 3 },
  { questionId: "tech_10", questionText: "What are SOLID design principles? Explain the Single Responsibility Principle and Interface Segregation Principle with examples.", type: "subjective", topic: "Software Design", difficulty: 2 },
  { questionId: "tech_11", questionText: "Explain SQL INNER JOIN, LEFT JOIN, RIGHT JOIN, and FULL OUTER JOIN with practical query scenarios.", type: "subjective", topic: "SQL Queries", difficulty: 1 },
  { questionId: "tech_12", questionText: "What is a Deadlock in Operating Systems? Explain the 4 necessary conditions and deadlock prevention strategies.", type: "subjective", topic: "Operating Systems", difficulty: 2 },
  { questionId: "tech_13", questionText: "How do HTTP headers, CORS, and JWT tokens interact to secure modern web application APIs?", type: "subjective", topic: "Web Security", difficulty: 2 },
  { questionId: "tech_14", questionText: "Explain V8 engine memory management, Heap vs Stack allocation, and Garbage Collection execution cycles.", type: "subjective", topic: "Node.js Internals", difficulty: 3 },
  { questionId: "tech_15", questionText: "What is the difference between Docker containers and Virtual Machines in cloud deployment infrastructure?", type: "subjective", topic: "DevOps & Cloud", difficulty: 1 },
  { questionId: "tech_16", questionText: "Explain database ACID properties vs BASE properties in high-scale distributed systems.", type: "subjective", topic: "Distributed Systems", difficulty: 3 },
  { questionId: "tech_17", questionText: "How do WebSockets differ from HTTP Long Polling for bi-directional real-time communication?", type: "subjective", topic: "Network Protocols", difficulty: 2 },
  { questionId: "tech_18", questionText: "Explain CPU scheduling algorithms (FCFS, SJF, Round Robin, Priority) and Round Robin time quantum tuning.", type: "subjective", topic: "Operating Systems", difficulty: 2 },
  { questionId: "tech_19", questionText: "How do you detect and debug memory leaks in Node.js applications using heap snapshot profiling?", type: "subjective", topic: "Debugging & Profiling", difficulty: 3 },
  { questionId: "tech_20", questionText: "Explain Git rebase vs Git merge. When would you prefer interactive rebase over standard merging?", type: "subjective", topic: "Version Control", difficulty: 1 },
  { questionId: "tech_21", questionText: "What is the difference between Abstract Classes and Interfaces in object-oriented architecture?", type: "subjective", topic: "OOP Concepts", difficulty: 2 },
  { questionId: "tech_22", questionText: "Explain microservices data consistency strategies (Saga Pattern vs Two-Phase Commit).", type: "subjective", topic: "Microservices", difficulty: 3 },
  { questionId: "tech_23", questionText: "How does DNS resolution translate a web domain URL to an IP address step-by-step?", type: "subjective", topic: "Computer Networks", difficulty: 1 },
  { questionId: "tech_24", questionText: "Explain Virtual Memory, Paging, and Page Fault resolution in Operating Systems.", type: "subjective", topic: "Operating Systems", difficulty: 2 },
  { questionId: "tech_25", questionText: "How do you design a rate limiter middleware for an API handling 10,000 requests per second?", type: "subjective", topic: "System Design", difficulty: 3 },
];

// ── Domain-Specific Questions ─────────────────────────────────
const DOMAIN_QUESTIONS = [
  { questionId: "dom_1", questionText: "React: How do custom Hooks encapsulate reusable stateful logic, and what rules must be followed when invoking Hooks?", type: "subjective", topic: "React Hooks", difficulty: 2 },
  { questionId: "dom_2", questionText: "React: Explain useMemo and useCallback hooks, including how improper usage can degrade application performance.", type: "subjective", topic: "React Performance", difficulty: 2 },
  { questionId: "dom_3", questionText: "React: How does React 18 automatic batching and Concurrent rendering (useTransition, useDeferredValue) work?", type: "subjective", topic: "React Concurrent", difficulty: 3 },
  { questionId: "dom_4", questionText: "JavaScript: Explain Closures, Lexical Scope, and practical memory implications in JavaScript web applications.", type: "subjective", topic: "JavaScript Scope", difficulty: 2 },
  { questionId: "dom_5", questionText: "Node.js: How do Node.js Streams process large files, and how is backpressure handled during stream piping?", type: "subjective", topic: "Node Streams", difficulty: 3 },
  { questionId: "dom_6", questionText: "Java: What is the difference between JDK, JRE, and JVM? Explain Java platform independence.", type: "subjective", topic: "Java Fundamentals", difficulty: 1 },
  { questionId: "dom_7", questionText: "Java: Explain Java Collection Framework mechanics (ArrayList vs LinkedList, HashMap collision handling).", type: "subjective", topic: "Java Collections", difficulty: 2 },
  { questionId: "dom_8", questionText: "Python: What is the Python GIL (Global Interpreter Lock), and how does it impact multi-threaded execution?", type: "subjective", topic: "Python Concurrency", difficulty: 3 },
];

// Helper to shuffle array for session variety
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Helper to get current Date string (YYYY-MM-DD)
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to get current Week string (YYYY-Www)
function getTodayWeekString() {
  const d = new Date();
  const year = d.getFullYear();
  const firstJan = new Date(year, 0, 1);
  const dayOfYear = Math.floor((d - firstJan) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((dayOfYear + firstJan.getDay() + 1) / 7);
  return `${year}-W${String(weekNumber).padStart(2, "0")}`;
}

// ── Strict Unique Question Assembly & Validation Engine ───────
async function generateUniqueQuestionSet({
  count = 5,
  category = "Technical",
  type = "daily",
  domain = "General",
  difficulty = "Medium",
}) {
  const uniqueQuestions = [];

  // Source pools based on requested category
  let candidatePool = [];
  if (category === "HR") {
    candidatePool = [...HR_QUESTIONS];
  } else if (category === "Aptitude") {
    candidatePool = [...APTITUDE_QUESTIONS];
  } else if (category === "Technical") {
    candidatePool = [...TECHNICAL_QUESTIONS];
  } else if (category === "Domain-Specific") {
    candidatePool = [...DOMAIN_QUESTIONS, ...TECHNICAL_QUESTIONS];
  } else if (category === "Mixed") {
    // For Weekly Mixed Challenges: Mix Technical, HR, Aptitude & Domain!
    candidatePool = [...TECHNICAL_QUESTIONS, ...HR_QUESTIONS, ...APTITUDE_QUESTIONS, ...DOMAIN_QUESTIONS];
  } else {
    candidatePool = [...TECHNICAL_QUESTIONS, ...HR_QUESTIONS, ...APTITUDE_QUESTIONS];
  }

  // Shuffle pool to ensure random non-repetitive selection across sessions
  candidatePool = shuffleArray(candidatePool);

  // 1️⃣ Compare against ALL questions already present in uniqueQuestions array
  for (const item of candidatePool) {
    if (uniqueQuestions.length >= count) break;
    if (!isDuplicateChallengeQuestion(uniqueQuestions, item)) {
      uniqueQuestions.push({
        questionId: item.questionId || `q_${uniqueQuestions.length + 1}`,
        questionText: item.questionText,
        type: item.type || "subjective",
        options: item.options || [],
        correctOptionId: item.correctOptionId || "",
        explanation: item.explanation || "",
        topic: item.topic || "General",
        difficulty: item.difficulty || 2,
      });
    }
  }

  // 2️⃣ Fallback / Dynamic Fill if pool didn't reach requested count
  let attempts = 0;
  const MAX_ATTEMPTS = count * 10;

  while (uniqueQuestions.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;
    const idx = uniqueQuestions.length + 1;
    const fallbackText = `Explain the key trade-offs and implementation considerations when designing ${category} solutions for topic #${idx} in ${domain}.`;
    const fallbackQuestion = {
      questionId: `q_fill_${idx}_${Date.now()}_${attempts}`,
      questionText: fallbackText,
      type: "subjective",
      options: [],
      correctOptionId: "",
      explanation: "",
      topic: `${category} Focus #${idx}`,
      difficulty: 2,
    };

    if (!isDuplicateChallengeQuestion(uniqueQuestions, fallbackQuestion)) {
      uniqueQuestions.push({
        questionId: `q_${uniqueQuestions.length + 1}`,
        questionText: fallbackQuestion.questionText,
        type: fallbackQuestion.type,
        options: fallbackQuestion.options,
        correctOptionId: fallbackQuestion.correctOptionId,
        explanation: fallbackQuestion.explanation,
        topic: fallbackQuestion.topic,
        difficulty: fallbackQuestion.difficulty,
      });
    }
  }

  // 3️⃣ Generation-Time Validation Check
  if (uniqueQuestions.length !== count) {
    throw new Error(`Challenge generation failed: Requested ${count} unique questions but only obtained ${uniqueQuestions.length}`);
  }

  return uniqueQuestions;
}

// ── Get or Create Persisted Daily Challenge ───────────────────
async function getOrCreateDailyChallenge() {
  const todayStr = getTodayDateString();

  let daily = await Challenge.findOne({
    type: "daily",
    periodKey: todayStr,
    active: true,
  });

  if (!daily) {
    const categories = ["Technical", "HR", "Aptitude", "Domain-Specific"];
    const dayNum = new Date().getDate();
    const category = categories[dayNum % categories.length];

    const questions = await generateUniqueQuestionSet({
      count: 5,
      category,
      type: "daily",
      domain: "General",
      difficulty: "Medium",
    });

    daily = await Challenge.create({
      title: `Daily ${category} Sprint — ${todayStr}`,
      type: "daily",
      periodKey: todayStr,
      category,
      domain: "General",
      difficulty: "Medium",
      questions,
      timeLimitMinutes: 10,
      xpReward: 100,
      active: true,
    });
  }

  return daily;
}

// ── Get or Create Persisted Weekly Challenge ──────────────────
async function getOrCreateWeeklyChallenge() {
  const weekStr = getTodayWeekString();

  let weekly = await Challenge.findOne({
    type: "weekly",
    periodKey: weekStr,
    active: true,
  });

  if (!weekly) {
    // Generate 15 100% UNIQUE questions for Weekly Challenge
    const questions = await generateUniqueQuestionSet({
      count: 15,
      category: "Mixed",
      type: "weekly",
      domain: "General",
      difficulty: "Hard",
    });

    weekly = await Challenge.create({
      title: `Weekly Arena Sprint — ${weekStr}`,
      type: "weekly",
      periodKey: weekStr,
      category: "Mixed",
      domain: "General",
      difficulty: "Hard",
      questions,
      timeLimitMinutes: 30,
      xpReward: 500,
      active: true,
    });
  }

  return weekly;
}

// ── Create Practice Challenge ──────────────────────────────────
async function createPracticeChallenge(category = "Technical", domain = "General") {
  const questions = await generateUniqueQuestionSet({
    count: 5,
    category,
    type: "practice",
    domain,
    difficulty: "Medium",
  });

  const practice = await Challenge.create({
    title: `${category} Practice Sprint`,
    type: "practice",
    periodKey: `practice_${Date.now()}`,
    category,
    domain,
    difficulty: "Medium",
    questions,
    timeLimitMinutes: 10,
    xpReward: 50,
    active: true,
  });

  return practice;
}

module.exports = {
  HR_QUESTIONS,
  APTITUDE_QUESTIONS,
  TECHNICAL_QUESTIONS,
  DOMAIN_QUESTIONS,
  isDuplicateChallengeQuestion,
  generateUniqueQuestionSet,
  getTodayDateString,
  getTodayWeekString,
  getOrCreateDailyChallenge,
  getOrCreateWeeklyChallenge,
  createPracticeChallenge,
};
