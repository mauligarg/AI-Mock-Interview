const Groq = require("groq-sdk");
const { getCompanyProfile, calculateExpectationMatch, generateCompanyFeedback } = require("../config/companyProfiles");

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;
  return new Groq({ apiKey: apiKey.trim() });
};

function getAIMode() {
  const isConfigured = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
  const model = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
  return {
    mode: isConfigured ? "LIVE" : "FALLBACK",
    provider: `Groq (${model})`,
    model,
    configured: isConfigured,
    message: isConfigured
      ? `AI Mode: LIVE (Groq ${model} active)`
      : "AI Mode: FALLBACK (Deterministic evaluation & domain question banks active)",
  };
}

console.log(`🤖 [AI Engine Diagnostics] ${getAIMode().message}`);

const DIFFICULTY_MAP = {
  1: "Easy",
  2: "Medium",
  3: "Hard",
};

const DOMAIN_QUESTION_BANK = {
  React: {
    1: [
      { text: "What is a React component and what is the difference between functional and class components?", topic: "Components" },
      { text: "What is state in React and how does it differ from props?", topic: "State & Props" },
      { text: "What is JSX and why do we use it in React applications?", topic: "JSX Basics" },
      { text: "What is the purpose of the key prop when rendering lists in React?", topic: "Lists & Keys" },
    ],
    2: [
      { text: "How would you create a reusable custom Hook in React to fetch data?", topic: "Custom Hooks" },
      { text: "Explain how state updates are batched in React 18 and why it matters.", topic: "State Management" },
      { text: "When would you use useMemo and useCallback, and what problems do they solve?", topic: "Performance Optimization" },
      { text: "How can incorrect dependency arrays affect useEffect and cause infinite loops?", topic: "Hooks & Effects" },
    ],
    3: [
      { text: "How does React's Reconciliation process and Fiber architecture work under the hood?", topic: "React Internals" },
      { text: "How do you optimize render performance for a dynamic table with 10,000 active rows?", topic: "Performance Optimization" },
      { text: "Explain Concurrent React features like useTransition and useDeferredValue with real-world scenarios.", topic: "Advanced React" },
      { text: "How would you architect a global state store using Context API vs Redux Toolkit avoiding unnecessary re-renders?", topic: "Architecture" },
    ],
  },
  "JavaScript/Node.js": {
    1: [
      { text: "What is the difference between var, let, and const in JavaScript?", topic: "Variables & Scope" },
      { text: "What are JavaScript primitives versus reference data types?", topic: "Data Types" },
      { text: "How does asynchronous execution work in Node.js using callbacks and Promises?", topic: "Async Basics" },
      { text: "What is the event loop in JavaScript at a high level?", topic: "Event Loop" },
    ],
    2: [
      { text: "Explain JavaScript Closures with a practical code example.", topic: "Closures" },
      { text: "How does the Node.js Event Loop manage the Microtask Queue vs Macrotask Queue?", topic: "Node Runtime" },
      { text: "What is the difference between process.nextTick() and setImmediate() in Node.js?", topic: "Event Loop" },
      { text: "How do JavaScript Prototype chains and inheritance work?", topic: "Prototypes" },
    ],
    3: [
      { text: "How do Node.js Streams work and how do you handle backpressure during large file processing?", topic: "Streams & IO" },
      { text: "How would you debug and fix a memory leak caused by unclosed closures in a Node.js server?", topic: "Memory Management" },
      { text: "Explain V8 engine execution pipeline, hidden classes, and inline caching optimization.", topic: "V8 Internals" },
      { text: "How do worker threads differ from cluster modules for CPU-intensive tasks in Node.js?", topic: "Concurrency" },
    ],
  },
  General: {
    1: [
      { text: "What are the core principles of Object-Oriented Programming (OOP)?", topic: "OOP Fundamentals" },
      { text: "What is the difference between RESTful APIs and GraphQL?", topic: "API Design" },
      { text: "What is Git rebase vs Git merge?", topic: "Version Control" },
      { text: "What is the difference between SQL and NoSQL databases?", topic: "Database Basics" },
    ],
    2: [
      { text: "How do HTTP headers, CORS, and JWT authentication work together to secure web apps?", topic: "Web Security" },
      { text: "Explain indexing in databases and how B-Trees improve query lookup times.", topic: "Database Optimization" },
      { text: "How would you design a rate limiter middleware for a RESTful API?", topic: "API Architecture" },
      { text: "What are solid design principles and how do you apply the Single Responsibility Principle?", topic: "Design Patterns" },
    ],
    3: [
      { text: "How would you architect a distributed caching layer using Redis to handle cache stampede?", topic: "System Design" },
      { text: "Explain database ACID properties vs BASE properties in distributed systems.", topic: "Distributed Systems" },
      { text: "How do microservices maintain data consistency across services without two-phase commit?", topic: "Microservices" },
      { text: "Design a fault-tolerant notification delivery service handling 1 million events/sec.", topic: "Scalability" },
    ],
  },
};

// ── Repeated Answer Detection ──────────────────────────────────
const COMMON_STOP_WORDS = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with",
  "he", "as", "you", "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her",
  "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up",
  "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time",
  "no", "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could",
  "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think",
  "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even",
  "new", "want", "because", "any", "these", "give", "day", "most", "us", "is", "are", "was", "were",
  "using", "used", "uses", "helps", "handled", "handling", "allows", "allowing"
]);

const GENERIC_TECH_KEYWORDS = new Set([
  "javascript", "js", "node", "nodejs", "react", "html", "css", "web", "app", "application",
  "function", "functions", "method", "methods", "code", "programming", "developer", "data",
  "system", "server", "client", "api", "apis", "event", "events", "loop",
  "promise", "promises", "async", "await", "callback", "callbacks", "state", "props", "hook",
  "hooks", "component", "components", "class", "classes", "value", "values", "type", "types"
]);

function computeLevenshteinSimilarity(str1, str2) {
  if (str1 === str2) return 1.0;
  const len1 = str1.length;
  const len2 = str2.length;
  if (len1 === 0 || len2 === 0) return 0.0;

  const matrix = Array.from({ length: len1 + 1 }, () => new Array(len2 + 1).fill(0));
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return 1.0 - matrix[len1][len2] / maxLen;
}

function computeWordLevenshteinSimilarity(words1, words2) {
  if (!words1 || !words2 || words1.length === 0 || words2.length === 0) return 0.0;
  const len1 = words1.length;
  const len2 = words2.length;

  const matrix = Array.from({ length: len1 + 1 }, () => new Array(len2 + 1).fill(0));
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = words1[i - 1] === words2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return 1.0 - matrix[len1][len2] / maxLen;
}

function detectRepeatedAnswer(answerHistory, newAnswer) {
  if (!newAnswer || typeof newAnswer !== "string" || !newAnswer.trim()) return false;
  if (!Array.isArray(answerHistory) || answerHistory.length === 0) return false;

  const normNew = newAnswer.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
  if (!normNew) return false;

  const wordsNew = normNew.split(" ").filter(Boolean);
  if (wordsNew.length === 0) return false;

  for (const prev of answerHistory) {
    if (!prev || typeof prev !== "string") continue;
    const normPrev = prev.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
    if (!normPrev) continue;

    // 1. Exact Match (ignoring case, whitespace, and punctuation)
    if (normNew === normPrev) return true;

    const wordsPrev = normPrev.split(" ").filter(Boolean);
    if (wordsPrev.length === 0) continue;

    // 2. High Character-level Levenshtein similarity (>= 88% identical text)
    const charSim = computeLevenshteinSimilarity(normNew, normPrev);
    if (charSim >= 0.88) return true;

    // 3. High Word-level sequence Levenshtein similarity (>= 85% word sequence match)
    const wordSim = computeWordLevenshteinSimilarity(wordsNew, wordsPrev);
    if (wordSim >= 0.85) return true;

    // 4. Content-word Token Similarity requiring length symmetry (lengthRatio >= 0.70)
    // Ensures long detailed answers are not matched against short snippets
    const lengthRatio = Math.min(wordsNew.length, wordsPrev.length) / Math.max(wordsNew.length, wordsPrev.length);
    if (lengthRatio >= 0.70) {
      const contentWordsNew = new Set(wordsNew.filter((w) => w.length > 3 && !COMMON_STOP_WORDS.has(w)));
      const contentWordsPrev = new Set(wordsPrev.filter((w) => w.length > 3 && !COMMON_STOP_WORDS.has(w)));

      if (contentWordsNew.size >= 4 && contentWordsPrev.size >= 4) {
        let intersection = 0;
        for (const w of contentWordsNew) {
          if (contentWordsPrev.has(w)) intersection++;
        }
        const union = new Set([...contentWordsNew, ...contentWordsPrev]).size;
        const jaccard = intersection / union;

        // Requiring near-identical set overlap (>= 88%) prevents false positives from shared technical vocabulary
        if (jaccard >= 0.88) return true;
      }
    }
  }

  return false;
}

// ── Duplicate Question Prevention ──────────────────────────────
function isDuplicateQuestion(questionHistory, candidateText) {
  if (!candidateText) return true;
  const cleanCandidate = candidateText.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  
  for (const q of questionHistory) {
    const prevText = typeof q === "string" ? q : q.questionText || "";
    const cleanPrev = prevText.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    
    if (cleanCandidate === cleanPrev) return true;
    
    const wordsCandidate = new Set(cleanCandidate.split(/\s+/).filter((w) => w.length > 3));
    const wordsPrev = new Set(cleanPrev.split(/\s+/).filter((w) => w.length > 3));
    
    if (wordsCandidate.size > 0 && wordsPrev.size > 0) {
      let common = 0;
      for (const w of wordsCandidate) {
        if (wordsPrev.has(w)) common++;
      }
      const sim = common / Math.min(wordsCandidate.size, wordsPrev.size);
      if (sim >= 0.75) return true;
    }
  }
  return false;
}

// ── Answer Evaluation ──────────────────────────────────────────
async function evaluateAnswer(domain, questionText, answer, currentDifficulty, companyKey = "general") {
  const diffLabel = DIFFICULTY_MAP[currentDifficulty] || "Medium";
  const cleanAnswer = (answer || "").trim();
  const companyProfile = getCompanyProfile(companyKey);

  // 1️⃣ Try AI Evaluation via Groq if available
  const groq = getGroqClient();
  const modelName = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
  if (groq) {
    try {
      const response = await groq.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: "system",
            content: `You are an expert technical interviewer representing ${companyProfile.name} evaluating a candidate's answer for a ${domain} position.
Company Focus Areas: ${companyProfile.focusAreas.join(", ")}
Company Interview Style: ${companyProfile.interviewStyle}
Evaluation Weights: ${JSON.stringify(companyProfile.evaluationWeights)}

Current question difficulty level is ${diffLabel} (${currentDifficulty} out of 3).

SCORING RUBRIC (0 – 10):
- 0–2: Incorrect, completely irrelevant, or extremely shallow answer.
- 3–4: Partially correct, but major concepts are missing.
- 5–6: Basic correct understanding, but incomplete, shallow, or lacking examples.
- 7: Good answer that covers the main concepts correctly, but lacks some technical depth, examples, edge cases, or trade-offs.
- 8: Strong answer with good technical depth, correct terminology, and most important concepts covered.
- 9: Excellent answer with strong technical depth, clear explanation, relevant examples, and solid understanding of internal behavior or trade-offs.
- 10: Exceptional answer that is highly complete, precise, technically deep, includes examples/trade-offs, and fully satisfies every part of the question.

IMPORTANT CALIBRATION RULES:
1. DO NOT CAP DETAILED ANSWERS AT 7. If the answer correctly explains the key concepts with good technical depth, award 8 or 9.
2. Evaluate based on ${companyProfile.name}'s specific hiring bar and evaluation criteria.
3. SPECIFIC FEEDBACK: In strengths and weaknesses, mention actual technical or behavioral concepts discussed or missing.

Return ONLY a raw valid JSON object with NO markdown formatting, NO backticks:
{
  "score": <number between 1 and 10>,
  "classification": "<"Exceptional" | "Excellent" | "Strong" | "Good" | "Average" | "Weak" | "Incorrect">",
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "weaknesses": ["<specific missing concept or 'None' if score >= 9>"],
  "companyMetrics": {
    "problemSolving": <0-100 score>,
    "technicalDepth": <0-100 score>,
    "optimization": <0-100 score>,
    "communication": <0-100 score>,
    "practicalReasoning": <0-100 score>,
    "behavioral": <0-100 score>,
    "systemDesign": <0-100 score>
  }
}`,
          },
          {
            role: "user",
            content: `Question (${diffLabel} difficulty, ${companyProfile.name} Style): "${questionText}"
Candidate Answer: "${cleanAnswer}"`,
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
      });

      const raw = response.choices[0].message.content.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const score = Math.max(1, Math.min(10, Math.round(Number(parsed.score) || 5)));

        const VALID_ENUMS = new Set(["Exceptional", "Excellent", "Strong", "Good", "Average", "Weak", "Incorrect"]);
        let classification = parsed.classification;
        if (!VALID_ENUMS.has(classification)) {
          classification = (
            score === 10 ? "Exceptional" :
            score >= 9 ? "Excellent" :
            score >= 8 ? "Strong" :
            score >= 7 ? "Good" :
            score >= 5 ? "Average" :
            score >= 3 ? "Weak" : "Incorrect"
          );
        }

        const metrics = parsed.companyMetrics || {};
        const basePct = score * 10;
        const normalizedMetrics = {
          problemSolving: Math.min(100, Math.max(0, Math.round(metrics.problemSolving ?? basePct))),
          technicalDepth: Math.min(100, Math.max(0, Math.round(metrics.technicalDepth ?? basePct))),
          optimization: Math.min(100, Math.max(0, Math.round(metrics.optimization ?? basePct))),
          communication: Math.min(100, Math.max(0, Math.round(metrics.communication ?? basePct))),
          practicalReasoning: Math.min(100, Math.max(0, Math.round(metrics.practicalReasoning ?? basePct))),
          behavioral: Math.min(100, Math.max(0, Math.round(metrics.behavioral ?? basePct))),
          systemDesign: Math.min(100, Math.max(0, Math.round(metrics.systemDesign ?? basePct))),
        };

        return {
          score,
          classification,
          strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths : ["Direct attempt at answering"],
          weaknesses: Array.isArray(parsed.weaknesses) && parsed.weaknesses.length > 0 ? parsed.weaknesses : ["Could add further technical depth"],
          companyMetrics: normalizedMetrics,
        };
      }
    } catch (err) {
      console.warn("Groq evaluateAnswer fallback triggered:", err.message);
    }
  }

  // 2️⃣ Deterministic Fallback Evaluation Engine
  const words = cleanAnswer.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  const lowerQ = questionText.toLowerCase();
  const lowerA = cleanAnswer.toLowerCase();

  // Requirements & Features detection
  const requiresScenarios = lowerQ.includes("scenario") || lowerQ.includes("example") || lowerQ.includes("real-world") || lowerQ.includes("use case") || lowerQ.includes("practical");
  const hasScenarioIndicators = ["example", "for instance", "such as", "scenario", "search", "filter", "list", "table", "debounce", "dashboard", "input", "production", "app", "user", "ui", "file i/o", "db", "network"].some((kw) => lowerA.includes(kw));

  // Technical concept markers across domains
  const conceptMarkers = [
    "single-threaded", "call stack", "event loop", "microtask", "macrotask", "task queue", "callback queue",
    "web api", "libuv", "non-blocking", "asynchronous", "callback", "callback hell", "promise", "async/await",
    "usetransition", "usedeferredvalue", "urgent", "priority", "non-urgent", "ispending", "starttransition",
    "deferred", "fiber", "re-render", "lane", "batch", "concurrent", "closure", "scope", "prototype",
    "stream", "buffer", "backpressure", "index", "b-tree", "acid", "redis", "cache", "rate limit",
    "component", "functional", "class component", "jsx", "props", "state", "usestate", "useeffect", "usememo",
    "usecallback", "custom hook", "lifecycle", "componentdidmount", "virtual dom", "reconciliation",
    "encapsulation", "abstraction", "inheritance", "polymorphism", "process", "thread", "context switch",
    "normalization", "primary key", "foreign key", "join", "inner join", "left join", "hash table",
    "dijkstra", "bfs", "dfs", "microservice", "memory overhead", "complexity", "big-o", "time complexity", "space complexity"
  ];
  const matchedConcepts = conceptMarkers.filter((cm) => lowerA.includes(cm));
  const conceptCount = matchedConcepts.length;

  let score = 5;
  const strengths = [];
  const weaknesses = [];

  if (wordCount < 8) {
    score = 2;
    weaknesses.push("Response is extremely brief and shallow");
  } else if (wordCount < 25) {
    score = 3;
    weaknesses.push("Very brief high-level definition; lacks detailed explanation of core concepts");
    if (requiresScenarios && !hasScenarioIndicators) {
      weaknesses.push("Missing concrete real-world scenarios or examples");
    }
  } else if (wordCount >= 50 && conceptCount === 0) {
    // Penalty for wordy fluff answers lacking technical terms
    score = 4;
    weaknesses.push("Response uses lengthy filler phrasing but lacks domain technical concepts or mechanisms");
  } else if (wordCount < 50) {
    if (conceptCount >= 3) {
      score = 8;
      strengths.push(`Strong concise summary covering key concepts (${matchedConcepts.slice(0, 3).join(", ")})`);
    } else if (conceptCount >= 2) {
      score = 7;
      strengths.push(`Good summary covering key concepts (${matchedConcepts.slice(0, 2).join(", ")})`);
    } else {
      score = 5;
      strengths.push("Basic correct understanding");
      weaknesses.push("Missing deeper technical details, mechanisms, and examples");
    }
  } else if (wordCount < 90) {
    if (conceptCount >= 4) {
      score = 9;
      strengths.push(`Excellent answer covering main concepts (${matchedConcepts.slice(0, 4).join(", ")})`);
      strengths.push("Good technical depth and terminology");
    } else if (conceptCount >= 2) {
      score = 8;
      strengths.push("Strong explanation of core concepts");
      strengths.push(`Covered key terms: ${matchedConcepts.slice(0, 3).join(", ")}`);
    } else {
      score = 6;
      strengths.push("Decent overall length");
      weaknesses.push("Lacks specific technical concepts and terminology");
    }
  } else {
    // wordCount >= 90
    if (conceptCount >= 4) {
      score = 9;
      strengths.push(`Excellent, thorough explanation covering key mechanisms (${matchedConcepts.slice(0, 4).join(", ")})`);
      strengths.push("Demonstrates strong technical depth and clarity");
      if (conceptCount >= 5 && (hasScenarioIndicators || currentDifficulty === 1)) {
        score = 10;
        strengths.push("Highly complete with practical context and precise terminology");
      }
    } else if (conceptCount >= 2) {
      score = 8;
      strengths.push("Detailed response with solid conceptual coverage");
      weaknesses.push("Could mention edge cases or low-level internal architecture");
    } else {
      score = 6;
      strengths.push("Detailed text response");
      weaknesses.push("Lacks deep technical mechanisms despite long response");
    }
  }

  // Adjust for explicit scenario requirement if missing
  if (requiresScenarios && !hasScenarioIndicators && score > 6) {
    score = Math.max(6, score - 1);
    weaknesses.push("Did not include specific real-world scenarios as requested by the question");
  }

  let classification = "Good";
  if (score === 10) classification = "Exceptional";
  else if (score >= 9) classification = "Excellent";
  else if (score >= 8) classification = "Strong";
  else if (score >= 7) classification = "Good";
  else if (score >= 5) classification = "Average";
  else if (score >= 3) classification = "Weak";
  else classification = "Incorrect";

  const basePct = score * 10;
  const normalizedMetrics = {
    problemSolving: Math.min(100, Math.max(0, basePct + (conceptCount > 3 ? 5 : -5))),
    technicalDepth: Math.min(100, Math.max(0, basePct + (conceptCount > 4 ? 8 : -5))),
    optimization: Math.min(100, Math.max(0, basePct + (lowerA.includes("optimize") || lowerA.includes("efficiency") ? 10 : 0))),
    communication: Math.min(100, Math.max(0, basePct + (wordCount > 40 ? 5 : -5))),
    practicalReasoning: Math.min(100, Math.max(0, basePct + (hasScenarioIndicators ? 10 : 0))),
    behavioral: Math.min(100, Math.max(0, basePct + (lowerA.includes("team") || lowerA.includes("decision") || lowerA.includes("learned") ? 10 : 0))),
    systemDesign: Math.min(100, Math.max(0, basePct + (lowerA.includes("scale") || lowerA.includes("architecture") || lowerA.includes("api") ? 8 : 0))),
  };

  return {
    score,
    classification,
    strengths: strengths.length ? strengths : ["Relevant response provided"],
    weaknesses: weaknesses.length ? weaknesses : ["None - strong technical answer"],
    companyMetrics: normalizedMetrics,
  };
}

// ── Difficulty Adjustment Logic ────────────────────────────────
function calculateNextDifficulty(currentDifficulty, score, consecutiveStrong, consecutiveWeak, consecutiveSkips = 0) {
  let nextDifficulty = currentDifficulty;
  let decisionReason = "";

  const isWeak = score <= 4;
  const isStrong = score >= 8;

  let newStrong = isStrong ? consecutiveStrong + 1 : 0;
  let newWeak = isWeak ? consecutiveWeak + 1 : 0;

  if (consecutiveSkips >= 2) {
    if (currentDifficulty > 1) {
      nextDifficulty = currentDifficulty - 1;
      decisionReason = `Difficulty decreased from ${DIFFICULTY_MAP[currentDifficulty]} to ${DIFFICULTY_MAP[nextDifficulty]} after 2 consecutive skips.`;
    } else {
      decisionReason = `Maintained Easy difficulty after skips as candidate is at foundational level.`;
    }
  } else if (isWeak) {
    if (currentDifficulty > 1) {
      nextDifficulty = currentDifficulty - 1;
      decisionReason = `Difficulty decreased from ${DIFFICULTY_MAP[currentDifficulty]} to ${DIFFICULTY_MAP[nextDifficulty]} due to incomplete or shallow technical explanation (Score: ${score}/10).`;
    } else {
      decisionReason = `Maintained Easy difficulty to reinforce fundamental concepts (Score: ${score}/10).`;
    }
  } else if (isStrong) {
    if (currentDifficulty < 3) {
      nextDifficulty = currentDifficulty + 1;
      decisionReason = `Difficulty increased from ${DIFFICULTY_MAP[currentDifficulty]} to ${DIFFICULTY_MAP[nextDifficulty]} due to strong technical depth and clarity (Score: ${score}/10).`;
    } else {
      decisionReason = `Maintained Hard difficulty following a strong answer (Score: ${score}/10).`;
    }
  } else {
    // Score 5–7 (Average)
    decisionReason = `Maintained ${DIFFICULTY_MAP[currentDifficulty]} difficulty based on moderate technical answer (Score: ${score}/10).`;
  }

  return {
    nextDifficulty,
    decisionReason,
    consecutiveStrong: newStrong,
    consecutiveWeak: newWeak,
  };
}

const COMPANY_QUESTION_BANK = {
  tcs: {
    1: [
      { text: "What are the four core principles of Object-Oriented Programming (OOP)? Explain Encapsulation and Abstraction with code examples.", topic: "OOP Concepts" },
      { text: "Explain the difference between a Process and a Thread in Operating Systems. How does context switching work?", topic: "Operating Systems" },
      { text: "What is DBMS normalization? Explain 1NF, 2NF, and 3NF with a database table example.", topic: "DBMS & SQL" },
      { text: "What is the TCP/IP model, and how does TCP differ from UDP in computer network communication?", topic: "Computer Networks" },
      { text: "Write or explain the logic to check if a given string is a Palindrome or reverse an array in-place.", topic: "Basic Coding" },
      { text: "What is the difference between Primary Key, Foreign Key, and Unique Key in SQL databases?", topic: "DBMS & SQL" },
    ],
    2: [
      { text: "Explain Method Overloading vs Method Overriding in Object-Oriented Programming. How does dynamic polymorphism work at runtime?", topic: "OOP Concepts" },
      { text: "What is a Deadlock in Operating Systems? What are the 4 necessary conditions for deadlock and how can it be prevented?", topic: "Operating Systems" },
      { text: "Explain SQL INNER JOIN, LEFT JOIN, RIGHT JOIN, and FULL OUTER JOIN with practical query examples.", topic: "DBMS & SQL" },
      { text: "How does the DNS lookup process work step-by-step when you enter a web URL in a browser?", topic: "Computer Networks" },
      { text: "Explain Virtual Memory and Paging in Operating Systems. What is a Page Fault and Page Replacement algorithm?", topic: "Operating Systems" },
      { text: "Explain how Binary Search works on a sorted array, its time complexity O(log N), and edge case handling.", topic: "Basic Coding" },
    ],
    3: [
      { text: "How do Abstract Classes differ from Interfaces in Object-Oriented Design? When would you choose one over the other?", topic: "OOP Concepts" },
      { text: "Explain database ACID properties in detail. How do SQL isolation levels handle concurrency anomalies like dirty reads?", topic: "DBMS & SQL" },
      { text: "Explain CPU Scheduling algorithms (FCFS, SJF, Round Robin, Priority). How does time quantum size affect Round Robin efficiency?", topic: "Operating Systems" },
      { text: "Explain TCP 3-Way Handshake and 4-Way Teardown connection lifecycle step-by-step.", topic: "Computer Networks" },
      { text: "Write or explain an efficient algorithm to detect a cycle in a Linked List or find duplicate elements in O(N) time.", topic: "Basic Coding" },
    ],
  },
  infosys: {
    1: [
      { text: "What is the difference between JDK, JRE, and JVM in Java? Explain Java platform independence.", topic: "Java Fundamentals" },
      { text: "What are Java access modifiers (public, private, protected, default) and their scope?", topic: "Java / OOP" },
      { text: "What is the difference between SQL DDL, DML, DCL, and TCL commands?", topic: "SQL & DBMS" },
      { text: "What is an array versus a linked list in basic data structures?", topic: "Basic DSA" },
    ],
    2: [
      { text: "Explain the Java Collection Framework (List, Set, Map) and differences between ArrayList and LinkedList.", topic: "Java / OOP" },
      { text: "Explain SQL GROUP BY, HAVING, and aggregate functions (COUNT, SUM, AVG) with a query example.", topic: "SQL Queries" },
      { text: "How does exception handling work in Java using try-catch-finally and throw vs throws?", topic: "Java Exception Handling" },
      { text: "Explain how Stack and Queue data structures work and their real-world applications.", topic: "Basic DSA" },
    ],
    3: [
      { text: "Explain Java Garbage Collection mechanisms and memory management (Heap vs Stack).", topic: "Java Internals" },
      { text: "Explain SQL indexing, composite indexes, and how indexing affects query execution plans.", topic: "SQL Optimization" },
      { text: "Design a relational database schema for an E-commerce system with Users, Orders, and Products.", topic: "Database Schema" },
    ],
  },
  google: {
    1: [
      { text: "How do Hash Tables handle collision resolution using Chaining vs Open Addressing?", topic: "Data Structures" },
      { text: "What is the difference between Breadth-First Search (BFS) and Depth-First Search (DFS) on graphs?", topic: "Graph Algorithms" },
    ],
    2: [
      { text: "How would you optimize a search query algorithm from O(N^2) to O(N log N) or O(N) space/time?", topic: "Optimization" },
      { text: "Explain Dijkstra's Algorithm for shortest path in weighted graphs and its time complexity with Priority Queue.", topic: "Graph Algorithms" },
    ],
    3: [
      { text: "How would you design a distributed rate limiter or URL shortener handling 100,000 QPS with low latency?", topic: "System Thinking" },
    ],
  },
};

// ── Next Question Generator ────────────────────────────────────
async function generateNextQuestion({
  domain = "General",
  currentTopic,
  nextDifficulty = 2,
  previousQuestion = "",
  previousAnswer = "",
  previousScore,
  strengths = [],
  weaknesses = [],
  questionHistory = [],
  companyKey = "general",
}) {
  const diffLabel = DIFFICULTY_MAP[nextDifficulty] || "Medium";
  const companyProfile = getCompanyProfile(companyKey);
  const companyKeyClean = (companyProfile.key || "general").toLowerCase();

  const stylePrefix = companyKeyClean !== "general" ? `[${companyProfile.name} Style]` : `[General / Standard Style]`;

  const groq = getGroqClient();
  const modelName = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
  if (groq) {
    try {
      const historyTexts = questionHistory.map((q) => (typeof q === "string" ? q : q.questionText));
      const response = await groq.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: "system",
            content: `You are an adaptive technical recruiter conducting a simulated ${companyProfile.name} interview in ${domain}.
Company Hiring Focus: ${companyProfile.focusAreas.join(", ")}
Interview Style: ${companyProfile.interviewStyle}
Company Directives: ${companyProfile.promptInstructions}

Generate ONE single interview question matching ${diffLabel} difficulty level in ${companyProfile.name}'s specific recruitment style.
DO NOT repeat any previous questions.
DO NOT ask questions with minor wording changes.
Make it feel like a real ${companyProfile.name} interviewer reacting dynamically to the candidate's previous answer and performance.

Return ONLY a raw valid JSON object with NO markdown, NO code block markers:
{
  "questionText": "<the company-style interview question>",
  "topic": "<specific subtopic name>"
}`,
          },
          {
            role: "user",
            content: `Previous Question: "${previousQuestion || "N/A"}"
Previous Answer: "${previousAnswer || "N/A"}"
Score: ${previousScore || 7}/10
Candidate Strengths: ${strengths.join(", ")}
Candidate Weaknesses: ${weaknesses.join(", ")}
Questions Already Asked to Avoid:
${JSON.stringify(historyTexts)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 250,
      });

      const raw = response.choices[0].message.content.trim();
      const cleaned = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.questionText && !isDuplicateQuestion(questionHistory, parsed.questionText)) {
        const text = parsed.questionText.trim();
        const formattedQuestionText = text.startsWith("[") ? text : `${stylePrefix} ${text}`;
        return {
          questionText: formattedQuestionText,
          topic: parsed.topic || currentTopic || domain,
          difficulty: nextDifficulty,
        };
      }
    } catch (err) {
      console.warn("Groq generateNextQuestion fallback triggered:", err.message);
    }
  }

  // ── Fallback Question Selector ──────────────────────────────
  let pool = [];
  if (companyKeyClean !== "general" && COMPANY_QUESTION_BANK[companyKeyClean]) {
    const compBank = COMPANY_QUESTION_BANK[companyKeyClean];
    pool = compBank[nextDifficulty] || compBank[2] || compBank[1] || [];
  }

  if (!pool || pool.length === 0) {
    const domainBank = DOMAIN_QUESTION_BANK[domain] || DOMAIN_QUESTION_BANK.General;
    pool = domainBank[nextDifficulty] || domainBank[2] || DOMAIN_QUESTION_BANK.General[2] || [];
  }

  for (const item of pool) {
    if (!isDuplicateQuestion(questionHistory, item.text)) {
      const formattedQuestionText = item.text.startsWith("[")
        ? item.text
        : `${stylePrefix} ${item.text}`;
      return {
        questionText: formattedQuestionText,
        topic: item.topic,
        difficulty: nextDifficulty,
      };
    }
  }

  // Fallback with dynamic topic variation
  const genericTopics = companyProfile.focusAreas && companyProfile.focusAreas.length > 0
    ? companyProfile.focusAreas
    : ["Fundamentals", "State Management", "Performance", "Best Practices", "Security"];
  const topic = genericTopics[questionHistory.length % genericTopics.length];
  return {
    questionText: `${stylePrefix} Could you elaborate on how you approach ${topic} in production ${domain} projects, including common trade-offs?`,
    topic,
    difficulty: nextDifficulty,
  };
}

// ── Final Report Generator ─────────────────────────────────────
function generateFinalReport(interview) {
  const questions = interview.questions || [];
  const totalQuestions = questions.length;
  const companyKey = interview.companyProfileKey || "general";
  const companyProfile = getCompanyProfile(companyKey);
  
  if (totalQuestions === 0) {
    const defaultMetrics = {
      problemSolving: 0,
      technicalDepth: 0,
      optimization: 0,
      communication: 0,
      practicalReasoning: 0,
      behavioral: 0,
      systemDesign: 0,
    };
    return {
      overallScore: 0,
      totalQuestions: 0,
      strongCount: 0,
      weakCount: 0,
      skippedCount: 0,
      repeatedCount: 0,
      startingDifficulty: DIFFICULTY_MAP[interview.currentDifficulty] || "Medium",
      highestDifficulty: DIFFICULTY_MAP[interview.highestDifficulty] || "Medium",
      finalDifficulty: DIFFICULTY_MAP[interview.currentDifficulty] || "Medium",
      difficultyProgression: [],
      topicScores: [],
      summary: "Interview completed with no answered questions.",
      revisionTopics: ["General technical review"],
      questions: [],
      companySimulationSummary: {
        selectedCompany: companyProfile.name,
        companyProfileKey: companyProfile.key,
        interviewStyle: companyProfile.interviewStyle,
        overallScore: 0,
        expectationMatch: "Needs More Preparation",
        companyMetrics: defaultMetrics,
        companyFeedback: "No questions were answered during this session.",
        improvementTopics: companyProfile.focusAreas,
      },
    };
  }

  let totalScoreSum = 0;
  let strongCount = 0;
  let weakCount = 0;
  let skippedCount = 0;
  let repeatedCount = interview.repeatedAnswerCount || 0;
  
  const topicMap = {};
  const metricSums = {
    problemSolving: 0,
    technicalDepth: 0,
    optimization: 0,
    communication: 0,
    practicalReasoning: 0,
    behavioral: 0,
    systemDesign: 0,
  };
  let metricCount = 0;

  questions.forEach((q) => {
    if (q.skipped) {
      skippedCount++;
    } else {
      totalScoreSum += (q.score || 0);
      if (q.score >= 8) strongCount++;
      else if (q.score < 5) weakCount++;

      const t = q.topic || interview.domain;
      if (!topicMap[t]) topicMap[t] = { sum: 0, count: 0 };
      topicMap[t].sum += q.score * 10;
      topicMap[t].count++;

      const basePct = (q.score || 5) * 10;
      metricSums.problemSolving += q.companyMetrics?.problemSolving ?? basePct;
      metricSums.technicalDepth += q.companyMetrics?.technicalDepth ?? basePct;
      metricSums.optimization += q.companyMetrics?.optimization ?? basePct;
      metricSums.communication += q.companyMetrics?.communication ?? basePct;
      metricSums.practicalReasoning += q.companyMetrics?.practicalReasoning ?? basePct;
      metricSums.behavioral += q.companyMetrics?.behavioral ?? basePct;
      metricSums.systemDesign += q.companyMetrics?.systemDesign ?? basePct;
      metricCount++;
    }
  });

  const validAnsweredCount = Math.max(1, totalQuestions - skippedCount);
  const averageScore = Math.round((totalScoreSum / validAnsweredCount) * 10);

  const topicScores = Object.keys(topicMap).map((topic) => ({
    topic,
    score: Math.round(topicMap[topic].sum / topicMap[topic].count),
  }));

  const difficultyProgression = (interview.difficultyHistory || []).map((h) => ({
    questionIndex: h.questionIndex,
    difficulty: h.difficulty,
    label: DIFFICULTY_MAP[h.difficulty] || "Medium",
    reason: h.reason,
  }));

  const startingDifficulty = difficultyProgression.length > 0
    ? difficultyProgression[0].label
    : DIFFICULTY_MAP[interview.currentDifficulty] || "Medium";

  const finalDifficulty = DIFFICULTY_MAP[interview.currentDifficulty] || "Medium";
  const highestDifficulty = DIFFICULTY_MAP[interview.highestDifficulty || interview.currentDifficulty] || "Medium";

  // Aggregate Company Metrics
  const divisor = Math.max(1, metricCount);
  const companyMetrics = {
    problemSolving: Math.round(metricSums.problemSolving / divisor),
    technicalDepth: Math.round(metricSums.technicalDepth / divisor),
    optimization: Math.round(metricSums.optimization / divisor),
    communication: Math.round(metricSums.communication / divisor),
    practicalReasoning: Math.round(metricSums.practicalReasoning / divisor),
    behavioral: Math.round(metricSums.behavioral / divisor),
    systemDesign: Math.round(metricSums.systemDesign / divisor),
  };

  const expectationMatch = calculateExpectationMatch(companyKey, averageScore, companyMetrics);
  const companyFeedback = generateCompanyFeedback(companyKey, averageScore);
  const companyImprovementTopics = companyProfile.recommendedTopics || companyProfile.focusAreas || [];

  // Formulate AI Summary
  let summary = `The candidate completed ${totalQuestions} questions in ${interview.domain} (${companyProfile.name} Recruiter Simulation). `;
  if (averageScore >= 80) {
    summary += `Demonstrated strong domain mastery aligned with ${companyProfile.name}'s expectations, reaching ${highestDifficulty} difficulty level. ${companyFeedback}`;
  } else if (averageScore >= 60) {
    summary += `Demonstrated solid foundational understanding across key topics for ${companyProfile.name}. Reached ${highestDifficulty} difficulty level. ${companyFeedback}`;
  } else {
    summary += `Showed initial understanding but struggled with ${companyProfile.name}'s technical depth and focus areas. Additional targeted practice is recommended. ${companyFeedback}`;
  }

  // Revision topics
  const weakQuestions = questions.filter((q) => q.score < 6 || q.skipped);
  const revisionTopics = Array.from(
    new Set([
      ...weakQuestions.map((q) => q.topic || `${interview.domain} Core Concepts`),
      ...companyImprovementTopics,
    ])
  );

  const companySimulationSummary = {
    selectedCompany: companyProfile.name,
    companyProfileKey: companyProfile.key,
    interviewStyle: companyProfile.interviewStyle,
    overallScore: averageScore,
    expectationMatch,
    companyMetrics,
    companyFeedback,
    improvementTopics: companyImprovementTopics,
  };

  return {
    overallScore: averageScore,
    totalQuestions,
    strongCount,
    weakCount,
    skippedCount,
    repeatedCount,
    startingDifficulty,
    highestDifficulty,
    finalDifficulty,
    difficultyProgression,
    topicScores,
    summary,
    revisionTopics,
    questions,
    companySimulationSummary,
  };
}

module.exports = {
  DIFFICULTY_MAP,
  getAIMode,
  getGroqAIMode: getAIMode,
  detectRepeatedAnswer,
  isDuplicateQuestion,
  evaluateAnswer,
  calculateNextDifficulty,
  generateNextQuestion,
  generateFinalReport,
};
