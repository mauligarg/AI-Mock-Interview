"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Interview {
  id: string;
  date: string;
  score: number;
  duration: number;
  topic: string;
  company?: string;
  companyProfileKey?: string;
  interviewMode?: string;
  companyFocusAreas?: string[];
}

interface ResumeAnalysis {
  summary: string;
  strengths: string[];
  recommendedDomains: { label: string; reason: string; confidence: number }[];
  experienceLevel: "Junior" | "Mid" | "Senior";
  skillsDetected: string[];
}

const INTERVIEW_DOMAINS = [
  {
    label: "JavaScript/Node.js",
    icon: "🟨",
    desc: "ES6+, async, Node runtime",
  },
  { label: "React", icon: "⚛️", desc: "Hooks, state, lifecycle" },
  { label: "Python", icon: "🐍", desc: "OOP, data structures, stdlib" },
  { label: "Data Science", icon: "📊", desc: "ML, pandas, statistics" },
  { label: "DevOps", icon: "⚙️", desc: "CI/CD, Docker, Kubernetes" },
  { label: "System Design", icon: "🏗️", desc: "Scalability, architecture" },
  { label: "Database Design", icon: "🗄️", desc: "SQL, NoSQL, indexing" },
  { label: "General", icon: "🎯", desc: "Behavioural & fundamentals" },
];

const COMPANY_PROFILES = [
  {
    key: "general",
    name: "General / Standard",
    badge: "Standard",
    icon: "🎯",
    desc: "Balanced technical fundamentals, coding, and problem solving across all levels.",
    focusAreas: ["CS Fundamentals", "Coding", "Problem Solving", "Communication"],
  },
  {
    key: "google",
    name: "Google",
    badge: "Product Titan",
    icon: "🔍",
    desc: "DSA, algorithmic reasoning, complexity analysis, optimization & system thinking.",
    focusAreas: ["DSA", "Algorithms", "Problem Solving", "System Thinking"],
  },
  {
    key: "amazon",
    name: "Amazon",
    badge: "Big Tech",
    icon: "📦",
    desc: "Coding, problem solving, STAR behavioral questions, leadership principles & ownership.",
    focusAreas: ["DSA", "Problem Solving", "Behavioral", "Ownership"],
  },
  {
    key: "microsoft",
    name: "Microsoft",
    badge: "Enterprise",
    icon: "🪟",
    desc: "Coding, debugging, software design thinking, CS fundamentals & practical algorithms.",
    focusAreas: ["Coding", "Debugging", "Design Thinking", "CS Fundamentals"],
  },
  {
    key: "tcs",
    name: "TCS",
    badge: "IT Services",
    icon: "🔷",
    desc: "Programming fundamentals, OOP, DBMS, SQL, Operating Systems, Computer Networks & clarity.",
    focusAreas: ["Fundamentals", "OOP", "DBMS", "OS", "CN", "Basic Coding"],
  },
  {
    key: "infosys",
    name: "Infosys",
    badge: "IT Services",
    icon: "🌐",
    desc: "Programming fundamentals, Java/OOP, SQL queries, DBMS, basic DSA & project understanding.",
    focusAreas: ["Fundamentals", "Java/OOP", "SQL", "DBMS", "Basic DSA"],
  },
  {
    key: "startup",
    name: "Startup",
    badge: "Fast-Paced",
    icon: "🚀",
    desc: "Real-world problem solving, project architecture, APIs, debugging, deployment & ownership.",
    focusAreas: ["APIs", "Debugging", "Architecture", "Ownership", "Practical Dev"],
  },
  {
    key: "product_based",
    name: "Product-Based Company",
    badge: "Product Focus",
    icon: "⚡",
    desc: "DSA, system design, optimization, scalability, system architecture & deep technical reasoning.",
    focusAreas: ["DSA", "System Design", "Optimization", "Scalability", "Architecture"],
  },
];
function ResumePanel({
  onDomainSelect,
  onAnalysisSuccess,
}: {
  onDomainSelect: (d: string) => void;
  onAnalysisSuccess?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "analyzing" | "results">(
    "upload",
  );
  const [analyzingStep, setAnalyzingStep] = useState(0);

  const analyzingSteps = [
    "Reading your resume…",
    "Detecting skills & technologies…",
    "Mapping to interview domains…",
    "Generating recommendations…",
  ];
  const handleFile = (f: File) => {
    const allowed = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(f.type)) {
      setError("Please upload a PDF, DOC, DOCX, or TXT file.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File must be under 5MB.");
      return;
    }
    setFile(f);
    setError(null);
    setAnalysis(null);
    setStep("upload");
  };
  const handleAnalyze = async () => {
    if (!file) return;
    setStep("analyzing");
    setError(null);
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % analyzingSteps.length;
      setAnalyzingStep(idx);
    }, 1100);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const { data } = await axiosInstance.post(
        "/api/resume/analyze",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      setAnalysis(data.analysis);
      setStep("results");
      if (onAnalysisSuccess) {
        onAnalysisSuccess();
      }
    } catch (error: any) {
      setError(error?.response?.data?.message);
      setStep("upload");
    } finally {
      clearInterval(interval);
    }
  };
  const reset = () => {
    setFile(null);
    setAnalysis(null);
    setError(null);
    setStep("upload");
  };
  const levelColor = (l: string) =>
    l === "Senior"
      ? "text-purple-500"
      : l === "Mid"
        ? "text-blue-500"
        : "text-green-500";

  return (
    <Card className="border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center text-lg">
            📄
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              AI Resume Analysis
            </p>
            <p className="text-xs text-muted-foreground">
              Upload your resume · Get domain recommendations
            </p>
          </div>
        </div>
        {step === "results" && (
          <button
            onClick={reset}
            className="text-xs text-muted-foreground hover:text-foreground border border-border/60 px-3 py-1 rounded-full transition-colors"
          >
            Upload new ↑
          </button>
        )}
      </div>

      <div className="p-5">
        {/* Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              onClick={() => fileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                dragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : file
                    ? "border-primary/40 bg-primary/[0.03]"
                    : "border-border/50 hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
                    📋
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(file.size / 1024).toFixed(0)} KB ·{" "}
                      {file.type.includes("pdf") ? "PDF" : "Document"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                    className="ml-1 w-7 h-7 rounded-full bg-muted hover:bg-muted/60 flex items-center justify-center text-xs text-muted-foreground flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl mb-3">☁️</div>
                  <p className="text-sm font-semibold text-foreground">
                    Drop your resume here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or click to browse · PDF, DOC, DOCX, TXT · Max 5 MB
                  </p>
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2.5 rounded-xl">
                ⚠️ {error}
              </p>
            )}

            {!file && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    icon: "🔍",
                    label: "Skills Detection",
                    desc: "Frameworks, languages, tools",
                  },
                  {
                    icon: "📊",
                    label: "Experience Level",
                    desc: "Junior / Mid / Senior",
                  },
                  {
                    icon: "🎯",
                    label: "Domain Matching",
                    desc: "Best-fit interview areas",
                  },
                  {
                    icon: "💪",
                    label: "Strength Analysis",
                    desc: "Your competitive edge",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border/40"
                  >
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={!file}
              className="w-full rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold py-5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              🤖 Analyse Resume with AI
            </Button>
          </div>
        )}

        {/* Analyzing */}
        {step === "analyzing" && (
          <div className="py-10 flex flex-col items-center gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                🤖
              </div>
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-bold text-foreground">
                Groq AI is reading your resume…
              </p>
              <p className="text-xs text-muted-foreground transition-all duration-300">
                {analyzingSteps[analyzingStep]}
              </p>
            </div>
            <div className="w-64 bg-border/50 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-pulse"
                style={{ width: "70%" }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              This usually takes 5–10 seconds
            </p>
          </div>
        )}

        {/* Results */}
        {step === "results" && analysis && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🧠</span>
                <p className="text-xs font-bold text-foreground">AI Summary</p>
                <span
                  className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full border ${
                    analysis.experienceLevel === "Senior"
                      ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                      : analysis.experienceLevel === "Mid"
                        ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        : "bg-green-500/10 text-green-600 border-green-500/20"
                  }`}
                >
                  {analysis.experienceLevel} Level
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {analysis.summary}
              </p>
            </div>

            {/* Skills */}
            {analysis.skillsDetected.length > 0 && (
              <div>
                <p className="text-xs font-bold text-foreground mb-2">
                  🛠 Skills Detected
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.skillsDetected.map((skill) => (
                    <span
                      key={skill}
                      className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended domains */}
            <div>
              <p className="text-xs font-bold text-foreground mb-2.5">
                🎯 Recommended Interview Domains
              </p>
              <div className="space-y-2">
                {analysis.recommendedDomains.map((rec, i) => {
                  const meta = INTERVIEW_DOMAINS.find(
                    (d) => d.label === rec.label,
                  );
                  return (
                    <button
                      key={rec.label}
                      onClick={() => onDomainSelect(rec.label)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border/60 hover:border-primary hover:bg-primary/5 transition-all group text-left"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-muted/50 border border-border/40 flex items-center justify-center text-xl group-hover:border-primary/30 transition-colors">
                        {meta?.icon || "🎯"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {i === 0 && (
                            <span className="text-[10px] bg-gradient-to-r from-primary to-accent text-white font-bold px-2 py-0.5 rounded-full">
                              TOP PICK
                            </span>
                          )}
                          <p className="text-sm font-semibold text-foreground truncate">
                            {rec.label}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {rec.reason}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <p className="text-xs font-bold text-primary">
                          {rec.confidence}%
                        </p>
                        <div className="w-14 h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                            style={{ width: `${rec.confidence}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity text-sm ml-1">
                        →
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Strengths */}
            {analysis.strengths.length > 0 && (
              <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                <p className="text-xs font-bold text-green-600 dark:text-green-400 mb-2.5">
                  ✅ Your Strengths
                </p>
                <ul className="space-y-1.5">
                  {analysis.strengths.map((s) => (
                    <li
                      key={s}
                      className="text-xs text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-green-500 mt-0.5 flex-shrink-0">
                        •
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground text-center">
              Click any domain above to start a tailored interview session
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
import PlacementReadinessCard, { ReadinessData } from "@/components/PlacementReadinessCard";

const page = () => {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading, user } = useAuth();
  const [interviews, setIntervies] = useState<Interview[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [ShowDomainSelector, setShowDomainSelector] = useState(false);
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null);
  const [filterDomain, setFilterDomain] = useState<String>("All");
  const [activeTab, setActiveTab] = useState<"history" | "resume" | "readiness">("readiness");

  // AI Recruiter Simulator selection state
  const [selectedCompanyKey, setSelectedCompanyKey] = useState<string>("google");

  const [readinessData, setReadinessData] = useState<ReadinessData | null>(null);
  const [readinessHasInterviews, setReadinessHasInterviews] = useState(false);
  const [readinessHasResume, setReadinessHasResume] = useState(false);
  const [gamificationSummary, setGamificationSummary] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchInterviews();
      fetchReadiness();
      fetchGamificationSummary();
    }
  }, [isLoggedIn]);

  const fetchGamificationSummary = async () => {
    try {
      const { data } = await axiosInstance.get("/api/gamification/profile");
      if (data && data.profile) {
        setGamificationSummary(data.profile);
      }
    } catch (error) {
      console.error("Failed to fetch gamification summary:", error);
    }
  };

  const fetchInterviews = async () => {
    try {
      setDataLoading(true);
      const { data } = await axiosInstance.get("/api/interviews");
      setIntervies(data.interviews || []);
    } catch (error) {
      console.error("Failed to fetch interviews:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchReadiness = async () => {
    try {
      const { data } = await axiosInstance.get("/api/readiness");
      if (data) {
        setReadinessData(data.readiness || null);
        setReadinessHasInterviews(data.hasInterviews || false);
        setReadinessHasResume(data.hasResume || false);
      }
    } catch (error) {
      console.error("Failed to fetch readiness:", error);
    }
  };
  const handleSelectDomain = (domain: string, company: string = selectedCompanyKey) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("active_interview_session");
    }
    router.push(`/interview?domain=${encodeURIComponent(domain)}&company=${encodeURIComponent(company)}`);
  };
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }
  if (!isLoggedIn) return null;

  const avgScore = interviews.length
    ? Math.round(
        interviews.reduce((s, i) => s + i.score, 0) / interviews.length,
      )
    : null;
  const totalMinutes = interviews.reduce((s, i) => s + i.duration, 0);
  const bestScore = interviews.length
    ? Math.max(...interviews.map((i) => i.score))
    : null;
  const recentScores = [...interviews].slice(-6).map((i) => i.score);
  const uniqueDomains = [
    "All",
    ...Array.from(new Set(interviews.map((i) => i.topic))),
  ];
  const filtered =
    filterDomain === "All"
      ? interviews
      : interviews.filter((i) => i.topic === filterDomain);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
        {/* ── Header ── */}
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">
              👋 Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-foreground">
              Your Dashboard
            </h1>
          </div>
          <Button
            size="lg"
            onClick={() => setShowDomainSelector(true)}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white rounded-full px-6 font-semibold shadow-md hover:shadow-lg transition-all self-start sm:self-auto"
          >
            ⚡ New Interview
          </Button>
        </section>

        {/* ── PEER CHALLENGE ARENA SHORTCUT CARD ── */}
        <Card className="p-6 border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-card to-orange-500/10 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shrink-0">
                🏆
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-foreground">Peer Challenge Arena</h2>
                  <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Competitive Sprints
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Compete in daily & weekly AI interview challenges, earn XP, unlock badges & rank among peers!
                </p>
                {gamificationSummary && (
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-semibold">
                    <span className="text-amber-600 dark:text-amber-400">🏅 Rank: {gamificationSummary.currentRank || "Bronze III"}</span>
                    <span className="text-orange-600 dark:text-orange-400">🔥 Streak: {gamificationSummary.currentStreak || 0} days</span>
                    <span className="text-primary font-bold">✨ {gamificationSummary.totalXP || 0} XP</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => router.push("/challenges")}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white rounded-full font-bold px-6 shadow-md hover:shadow-lg transition-all shrink-0"
            >
              🏆 Enter Peer Challenge Arena →
            </Button>
          </div>
        </Card>
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Sessions",
              value: interviews.length.toString(),
              sub: `${interviews.length} session${interviews.length !== 1 ? "s" : ""}`,
              icon: "📋",
            },
            {
              label: "Average Score",
              value: avgScore !== null ? `${avgScore}%` : "—",
              sub:
                avgScore !== null
                  ? avgScore >= 80
                    ? "Excellent 🔥"
                    : avgScore >= 60
                      ? "Good 👍"
                      : "Keep going 💪"
                  : "No data yet",
              icon: "📊",
              accent: true,
            },
            {
              label: "Best Score",
              value: bestScore !== null ? `${bestScore}%` : "—",
              sub: bestScore !== null ? "Personal best" : "No data yet",
              icon: "🏆",
            },
            {
              label: "Practice Time",
              value:
                totalMinutes >= 60
                  ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
                  : `${totalMinutes}m`,
              sub: "Total invested",
              icon: "⏱",
            },
          ].map((stat, i) => (
            <Card
              key={i}
              className={`p-5 border ${
                (stat as any).accent
                  ? "border-primary/30 bg-primary/[0.03]"
                  : "border-border/50"
              } hover:border-primary/40 transition-colors`}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium">
                  {stat.label}
                </p>
                <span className="text-lg">{stat.icon}</span>
              </div>
              <p
                className={`text-2xl font-black mb-0.5 ${
                  (stat as any).accent
                    ? "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                    : "text-foreground"
                }`}
              >
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.sub}</p>
            </Card>
          ))}
        </section>
        {recentScores.length >= 2 && (
          <Card className="p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground mb-0.5">
                  Score Trend
                </p>
                <p className="text-xs text-muted-foreground">
                  Last {recentScores.length} sessions
                </p>
              </div>
              <div className="flex items-end gap-3">
                <MiniSparkline scores={recentScores} />
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Latest</p>
                  <p className="text-sm font-bold text-primary">
                    {recentScores[recentScores.length - 1]}%
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
        {/* Featured Placement Readiness Overview Section */}
        <section>
          <PlacementReadinessCard
            readiness={readinessData}
            hasInterviews={readinessHasInterviews}
            hasResume={readinessHasResume}
            isLoading={dataLoading}
          />
        </section>

        <section>
          <div className="flex items-center gap-1 mb-6 border-b border-border/50 overflow-x-auto">
            {(["readiness", "history", "resume"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "readiness"
                  ? "🚀 Placement Readiness"
                  : tab === "history"
                  ? "📋 Interview History"
                  : "📄 Resume Analysis"}
              </button>
            ))}
          </div>

          {activeTab === "readiness" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">
                  AI Placement Readiness Analytics
                </p>
                <Button
                  size="sm"
                  onClick={() => router.push("/dashboard/readiness")}
                  className="text-xs font-bold bg-primary text-primary-foreground hover:opacity-90"
                >
                  Full Readiness Report →
                </Button>
              </div>
              <PlacementReadinessCard
                readiness={readinessData}
                hasInterviews={readinessHasInterviews}
                hasResume={readinessHasResume}
                isLoading={dataLoading}
              />
            </div>
          )}

          {activeTab === "history" && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <p className="text-sm text-muted-foreground">
                  Your recent practice sessions
                </p>
                {uniqueDomains.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {uniqueDomains.map((d) => (
                      <button
                        key={d}
                        onClick={() => setFilterDomain(d)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                          filterDomain === d
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {dataLoading ? (
                <div>
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-5 border border-border/50">
                      <div className="animate-pulse flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-1/3" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                        <div className="w-16 h-8 bg-muted rounded-full" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filtered.length === 0 && interviews.length === 0 ? (
                <Card className="p-12 text-center border-2 border-dashed border-border">
                  <div className="text-5xl mb-4">📝</div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    No sessions yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                    Start a practice interview or upload your resume for
                    personalised domain suggestions.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button
                      onClick={() => setShowDomainSelector(true)}
                      className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white rounded-full px-5 text-sm"
                    >
                      ⚡ Start Interview
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("resume")}
                      className="rounded-full px-5 text-sm"
                    >
                      📄 Analyse Resume
                    </Button>
                  </div>
                </Card>
              ) : filtered.length === 0 ? (
                <Card className="p-8 text-center border border-border/50">
                  <p className="text-muted-foreground text-sm">
                    No sessions for "{filterDomain}"
                  </p>
                </Card>
              ) : (
                <div>
                  {[...filtered].reverse().map((interview) => {
                    const meta = INTERVIEW_DOMAINS.find(
                      (d) => d.label === interview.topic,
                    );
                    return (
                      <Card
                        key={interview.id}
                        className="p-5 border border-border/50 hover:border-primary/40 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-center text-xl flex-shrink-0 group-hover:border-primary/30 transition-colors">
                            {meta?.icon || "🎯"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-semibold text-foreground text-sm truncate">
                                {interview.topic}
                              </p>
                              {interview.company && interview.company !== "General" && (
                                <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">
                                  🏢 {interview.company}
                                </span>
                              )}
                              <ScoreBadge score={interview.score} />
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                              <span>
                                📅{" "}
                                {new Date(interview.date).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </span>
                              <span>⏱ {interview.duration} min</span>
                            </div>
                          </div>
                          <div className="hidden md:flex flex-col items-end gap-1 w-28">
                            <p className="text-xs text-muted-foreground">
                              Score
                            </p>
                            <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                                style={{ width: `${interview.score}%` }}
                              />
                            </div>
                            <p className="text-xs font-semibold text-foreground">
                              {interview.score}%
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/interview?sessionId=${interview.id}`)}
                              className="rounded-full text-xs border-border/60 hidden sm:flex hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                              Details
                            </Button>
                            <Button
                              size="sm"
                              className="rounded-full text-xs bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white"
                              onClick={() =>
                                handleSelectDomain(interview.topic, interview.companyProfileKey || "general")
                              }
                            >
                              Retake
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {activeTab === "resume" && (
            <ResumePanel
              onDomainSelect={handleSelectDomain}
              onAnalysisSuccess={fetchReadiness}
            />
          )}
        </section>
      </div>
      {ShowDomainSelector && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDomainSelector(false);
          }}
        >
          <Card className="w-full max-w-3xl p-6 sm:p-8 border border-border shadow-2xl space-y-6 bg-card max-h-[90vh] overflow-y-auto my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border/60">
              <div>
                <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                  <span>🏢</span> AI Recruiter Simulator & Setup
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select a target company to simulate their recruitment style and evaluation criteria
                </p>
              </div>
              <button
                onClick={() => setShowDomainSelector(false)}
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            {/* 1️⃣ COMPANY RECRUITER SIMULATION SELECTOR */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Select Target Company Profile</span>
                <span className="text-primary text-[11px] font-semibold">
                  Adapts question style, follow-ups & feedback
                </span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {COMPANY_PROFILES.map((comp) => {
                  const isSelected = selectedCompanyKey === comp.key;
                  return (
                    <button
                      key={comp.key}
                      onClick={() => setSelectedCompanyKey(comp.key)}
                      className={`p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between gap-2 ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20"
                          : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xl">{comp.icon}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            isSelected
                              ? "bg-primary text-white border-primary"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {comp.badge}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground truncate">{comp.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Selected Company Description Box */}
              {(() => {
                const activeComp = COMPANY_PROFILES.find((c) => c.key === selectedCompanyKey) || COMPANY_PROFILES[0];
                return (
                  <div className="p-4 rounded-xl bg-muted/40 border border-primary/20 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <span>{activeComp.icon}</span> {activeComp.name} Interview Focus
                      </span>
                      <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold">
                        Simulated Recruitment Profile
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">{activeComp.desc}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="font-semibold text-muted-foreground text-[11px] self-center mr-1">Core Focus:</span>
                      {activeComp.focusAreas.map((fa, i) => (
                        <span key={i} className="px-2.5 py-0.5 rounded-full text-[11px] bg-background border border-border font-medium text-foreground">
                          {fa}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 2️⃣ DOMAIN SELECTOR */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-foreground">Select Technical Role / Domain</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {INTERVIEW_DOMAINS.map((domain) => {
                  const isHovered = hoveredDomain === domain.label;
                  return (
                    <button
                      key={domain.label}
                      onMouseEnter={() => setHoveredDomain(domain.label)}
                      onMouseLeave={() => setHoveredDomain(null)}
                      onClick={() => {
                        setShowDomainSelector(false);
                        handleSelectDomain(domain.label, selectedCompanyKey);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between gap-1.5 ${
                        isHovered
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/60 hover:border-primary/40"
                      }`}
                    >
                      <span className="text-2xl">{domain.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{domain.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{domain.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border/60">
              <Button
                variant="ghost"
                className="rounded-xl text-muted-foreground hover:text-foreground text-xs"
                onClick={() => setShowDomainSelector(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowDomainSelector(false);
                  handleSelectDomain("General", selectedCompanyKey);
                }}
                className="rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold text-xs px-6 py-2.5 shadow-md"
              >
                🚀 Start {COMPANY_PROFILES.find((c) => c.key === selectedCompanyKey)?.name} Interview →
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400"
      : score >= 60
        ? "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400"
        : "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-bold ${color}`}
    >
      {score >= 80 ? "🟢" : score >= 60 ? "🔵" : "🟠"} {score}%
    </span>
  );
}
function MiniSparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const max = Math.max(...scores, 100);
  const min = Math.min(...scores, 0);
  const range = max - min || 1;
  const w = 80,
    h = 28;
  const pts = scores
    .map(
      (s, i) =>
        `${(i / (scores.length - 1)) * w},${h - ((s - min) / range) * h}`,
    )
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="overflow-visible"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {scores.map((s, i) => {
        const x = (i / (scores.length - 1)) * w;
        const y = h - ((s - min) / range) * h;
        return (
          <circle key={i} cx={x} cy={y} r="2.5" className="fill-primary" />
        );
      })}
    </svg>
  );
}
export default page;
