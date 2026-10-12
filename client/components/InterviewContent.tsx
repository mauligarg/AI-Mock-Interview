"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputBox } from "@/components/InputBox";
import ChatContainer from "@/components/ChatContainer";

interface CompanyMetrics {
  problemSolving?: number;
  technicalDepth?: number;
  optimization?: number;
  communication?: number;
  practicalReasoning?: number;
  behavioral?: number;
  systemDesign?: number;
}

interface CompanySimulationSummary {
  selectedCompany: string;
  companyProfileKey: string;
  interviewStyle: string;
  overallScore: number;
  expectationMatch: string;
  companyMetrics: CompanyMetrics;
  companyFeedback: string;
  improvementTopics: string[];
}

interface QuestionRecord {
  questionId: string;
  questionText: string;
  topic: string;
  difficulty: number;
  answer?: string;
  score?: number;
  classification?: string;
  strengths?: string[];
  weaknesses?: string[];
  skipped?: boolean;
  repeatedAnswer?: boolean;
  decisionReason?: string;
  companyMetrics?: CompanyMetrics;
}

interface DifficultyHistoryItem {
  questionIndex: number;
  difficulty: number;
  label: string;
  reason?: string;
}

interface TopicScore {
  topic: string;
  score: number;
}

interface FinalReport {
  overallScore: number;
  totalQuestions: number;
  strongCount: number;
  weakCount: number;
  skippedCount: number;
  repeatedCount: number;
  startingDifficulty: string;
  highestDifficulty: string;
  finalDifficulty: string;
  difficultyProgression: DifficultyHistoryItem[];
  topicScores: TopicScore[];
  summary: string;
  revisionTopics: string[];
  questions: QuestionRecord[];
  companySimulationSummary?: CompanySimulationSummary;
}

interface EvaluationFeedback {
  score: number;
  classification: string;
  strengths: string[];
  weaknesses: string[];
  currentDifficulty: number;
  nextDifficulty: number;
  difficultyDecision: string;
  nextQuestion?: string;
  nextTopic?: string;
  companyMetrics?: CompanyMetrics;
}

const TOTAL_QUESTIONS = 5;

const domainEmoji: Record<string, string> = {
  JavaScript: "🟨",
  "JavaScript/Node.js": "🟨",
  React: "⚛️",
  Python: "🐍",
  "Data Science": "📊",
  DevOps: "⚙️",
  "System Design": "🏗️",
  "Database Design": "🗄️",
  General: "🎯",
};

const DIFFICULTY_CONFIG: Record<
  number,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  1: {
    label: "Easy",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  2: {
    label: "Medium",
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
  },
  3: {
    label: "Hard",
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-500/30",
    dot: "bg-purple-500",
  },
};

const InterviewContent = () => {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const domain = searchParams.get("domain") || "General";
  const companyParam = searchParams.get("company") || "general";
  const sessionIdParam = searchParams.get("sessionId");

  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [currentQuestionText, setCurrentQuestionText] = useState<string>("");
  const [currentTopic, setCurrentTopic] = useState<string>(domain);
  const [currentDifficulty, setCurrentDifficulty] = useState<number>(2);
  const [questionsAnswered, setQuestionsAnswered] = useState<number>(0);
  const [difficultyHistory, setDifficultyHistory] = useState<DifficultyHistoryItem[]>([]);
  const [answerInput, setAnswerInput] = useState<string>("");

  // Company Recruiter Simulator state
  const [companyName, setCompanyName] = useState<string>("General");
  const [companyProfileKey, setCompanyProfileKey] = useState<string>(companyParam);
  const [interviewMode, setInterviewMode] = useState<string>("Standard Adaptive");
  const [companyFocusAreas, setCompanyFocusAreas] = useState<string[]>([]);
  const [companyDescription, setCompanyDescription] = useState<string>("");

  // Feedback, Warning, and Error states
  const [activeFeedback, setActiveFeedback] = useState<EvaluationFeedback | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isInterviewComplete, setIsInterviewComplete] = useState<boolean>(false);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  // Protection against React 18 double execution & duplicate session creation
  const initializationStartedRef = useRef(false);
  const initializationKeyRef = useRef<string>("");

  if (!initializationKeyRef.current) {
    initializationKeyRef.current =
      typeof window !== "undefined" && window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : `init_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // ── Redirect Unauthenticated ──────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, authLoading, router]);

  // ── Timer Effect ─────────────────────────────────────────────
  useEffect(() => {
    if (isInterviewComplete || !sessionId) return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isInterviewComplete, sessionId]);

  // ── Session Initialization & Recovery ─────────────────────────
  useEffect(() => {
    if (isLoggedIn) {
      if (sessionIdParam) {
        recoverSession(sessionIdParam);
      } else {
        if (initializationStartedRef.current) return;
        initializationStartedRef.current = true;
        startNewInterview();
      }
    }
  }, [isLoggedIn, sessionIdParam]);

  const startNewInterview = async () => {
    try {
      setIsLoading(true);
      setWarningMessage(null);
      setSubmitError(null);
      setActiveFeedback(null);
      setIsInterviewComplete(false);
      setFinalReport(null);

      const { data } = await axiosInstance.post("/api/interviews/start", {
        domain,
        company: companyParam,
        initializationKey: initializationKeyRef.current,
      });
      if (data) {
        setSessionId(data.sessionId);
        setCurrentQuestionText(data.question);
        setCurrentTopic(data.topic || domain);
        setCurrentDifficulty(data.difficulty || 2);
        setCompanyName(data.company || "General");
        setCompanyProfileKey(data.companyProfileKey || "general");
        setInterviewMode(data.interviewMode || "Standard Adaptive");
        setCompanyFocusAreas(data.companyFocusAreas || []);
        setCompanyDescription(data.companyDescription || "");
        setQuestionsAnswered(0);
        setDifficultyHistory([
          {
            questionIndex: 1,
            difficulty: data.difficulty || 2,
            label: DIFFICULTY_CONFIG[data.difficulty || 2].label,
            reason: `${data.company || "General"} Recruiter Simulation initiated.`,
          },
        ]);
        localStorage.setItem("active_interview_session", data.sessionId);
        if (typeof window !== "undefined") {
          window.history.replaceState(
            null,
            "",
            `/interview?domain=${encodeURIComponent(domain)}&company=${encodeURIComponent(data.companyProfileKey || companyParam)}&sessionId=${data.sessionId}`
          );
        }
      }
    } catch (error) {
      console.error("Failed to start interview", error);
      setSubmitError("Network error starting interview. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const recoverSession = async (id: string) => {
    try {
      setIsLoading(true);
      const { data } = await axiosInstance.get(`/api/interviews/${id}`);
      if (data && data.interview) {
        const interview = data.interview;
        setSessionId(interview._id);
        setCurrentDifficulty(interview.currentDifficulty || 2);
        setQuestionsAnswered(interview.questionsAnswered || 0);
        setDifficultyHistory(interview.difficultyHistory || []);
        setCompanyName(interview.company || "General");
        setCompanyProfileKey(interview.companyProfileKey || "general");
        setInterviewMode(interview.interviewMode || "Standard Adaptive");
        setCompanyFocusAreas(interview.companyFocusAreas || []);

        if (interview.isComplete) {
          setIsInterviewComplete(true);
          setFinalReport(interview.finalReport);
        } else {
          const activeQ = interview.questions[interview.questions.length - 1];
          if (activeQ) {
            setCurrentQuestionText(activeQ.questionText);
            setCurrentTopic(activeQ.topic || interview.domain);
          }
        }
      } else {
        localStorage.removeItem("active_interview_session");
        startNewInterview();
      }
    } catch (error) {
      localStorage.removeItem("active_interview_session");
      startNewInterview();
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Submit Answer ──────────────────────────────────────────────
  const handleAnswerSubmit = async () => {
    if (!answerInput.trim() || !sessionId || isLoading) return;
    setIsLoading(true);
    setWarningMessage(null);
    setSubmitError(null);

    try {
      const { data } = await axiosInstance.post("/api/interviews/submit-answer", {
        sessionId,
        answer: answerInput,
        domain,
        questionsAnswered,
      });

      if (data) {
        // Handle repeated answer warning specifically confirmed by backend
        if (data.repeatedAnswer) {
          setWarningMessage(data.warningMessage);
          setIsLoading(false);
          return;
        }

        const newCount = questionsAnswered + 1;
        setQuestionsAnswered(newCount);
        setAnswerInput("");

        const feedbackObj: EvaluationFeedback = {
          score: data.score,
          classification: data.classification,
          strengths: data.strengths || [],
          weaknesses: data.weaknesses || [],
          currentDifficulty: data.currentDifficulty,
          nextDifficulty: data.nextDifficulty,
          difficultyDecision: data.difficultyDecision,
          nextQuestion: data.nextQuestion,
          nextTopic: data.nextTopic,
        };

        setActiveFeedback(feedbackObj);

        if (data.isComplete || newCount >= TOTAL_QUESTIONS) {
          setIsInterviewComplete(true);
          setFinalReport(data.finalReport);
          localStorage.removeItem("active_interview_session");
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
      setSubmitError("Error submitting answer. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Skip Question ──────────────────────────────────────────────
  const handleSkipQuestion = async () => {
    if (!sessionId || isLoading) return;
    setIsLoading(true);
    setWarningMessage(null);

    try {
      const { data } = await axiosInstance.post("/api/interviews/skip", {
        sessionId,
        domain,
        questionsAnswered,
      });

      if (data) {
        const newCount = questionsAnswered + 1;
        setQuestionsAnswered(newCount);
        setAnswerInput("");

        if (data.isComplete || newCount >= TOTAL_QUESTIONS) {
          setIsInterviewComplete(true);
          setFinalReport(data.finalReport);
          localStorage.removeItem("active_interview_session");
        } else {
          setCurrentDifficulty(data.nextDifficulty);
          setCurrentQuestionText(data.nextQuestion);
          setCurrentTopic(data.nextTopic || domain);

          setDifficultyHistory((prev) => [
            ...prev,
            {
              questionIndex: newCount + 1,
              difficulty: data.nextDifficulty,
              label: DIFFICULTY_CONFIG[data.nextDifficulty]?.label || "Medium",
              reason: data.difficultyDecision,
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Skip error:", error);
      setWarningMessage("Error skipping question. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Continue to Next Question after Feedback ──────────────────
  const handleContinueNextQuestion = () => {
    if (!activeFeedback) return;
    if (activeFeedback.nextQuestion) {
      setCurrentQuestionText(activeFeedback.nextQuestion);
      setCurrentTopic(activeFeedback.nextTopic || domain);
      setCurrentDifficulty(activeFeedback.nextDifficulty);

      setDifficultyHistory((prev) => [
        ...prev,
        {
          questionIndex: questionsAnswered + 1,
          difficulty: activeFeedback.nextDifficulty,
          label: DIFFICULTY_CONFIG[activeFeedback.nextDifficulty]?.label || "Medium",
          reason: activeFeedback.difficultyDecision,
        },
      ]);
    }
    setActiveFeedback(null);
  };

  const handleEndInterview = () => {
    localStorage.removeItem("active_interview_session");
    router.push("/dashboard");
  };

  if (authLoading || !isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* ── Sticky Navigation Header ────────────────────────────── */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Domain Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center text-xl shrink-0">
                {domainEmoji[domain] || "🎯"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-bold text-foreground truncate">
                    {domain} Adaptive Interview
                  </h1>
                  {companyName && companyName !== "General" && (
                    <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-bold">
                      🏢 {companyName} Recruiter Simulation
                    </span>
                  )}
                  {!isInterviewComplete && (
                    <span className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Engine
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {companyName !== "General" ? `${companyName}-Style Questioning & Evaluation` : "AI-Powered Difficulty Scaling"}
                </p>
              </div>
            </div>

            {/* Current Difficulty Badge & History Trail */}
            {!isInterviewComplete && (
              <div className="hidden md:flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground font-medium">Difficulty:</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      DIFFICULTY_CONFIG[currentDifficulty]?.bg
                    } ${DIFFICULTY_CONFIG[currentDifficulty]?.text} ${
                      DIFFICULTY_CONFIG[currentDifficulty]?.border
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        DIFFICULTY_CONFIG[currentDifficulty]?.dot
                      }`}
                    />
                    {DIFFICULTY_CONFIG[currentDifficulty]?.label} Level
                  </span>
                </div>

                {/* Difficulty History Trail */}
                {difficultyHistory.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    {difficultyHistory.map((dh, idx) => (
                      <React.Fragment key={idx}>
                        <span
                          className={`font-semibold ${
                            dh.difficulty === 3
                              ? "text-purple-600 dark:text-purple-400"
                              : dh.difficulty === 2
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {dh.label}
                        </span>
                        {idx < difficultyHistory.length - 1 && <span className="opacity-40">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Timer & Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {!isInterviewComplete && (
                <div className="flex items-center gap-1.5 bg-muted/60 border border-border/60 px-3 py-1.5 rounded-full">
                  <span className="text-xs text-muted-foreground">⏱</span>
                  <span className="text-sm font-mono font-semibold text-foreground tabular-nums">
                    {formatTime(elapsedSeconds)}
                  </span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => (isInterviewComplete ? handleEndInterview() : setShowExitConfirm(true))}
                className="rounded-full text-xs border-border/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                {isInterviewComplete ? "Exit to Dashboard" : "Exit Session"}
              </Button>
            </div>
          </div>

          {/* Progress Bar Header */}
          {!isInterviewComplete && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>
                  Question {Math.min(questionsAnswered + 1, TOTAL_QUESTIONS)} of {TOTAL_QUESTIONS}
                </span>
                <span className="md:hidden">
                  Difficulty: {DIFFICULTY_CONFIG[currentDifficulty]?.label}
                </span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                  style={{ width: `${(questionsAnswered / TOTAL_QUESTIONS) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 border-border space-y-4">
            <h3 className="text-lg font-bold text-foreground">Exit Interview Session?</h3>
            <p className="text-sm text-muted-foreground">
              Your active progress is saved. You can resume this session later from your dashboard.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowExitConfirm(false)}>
                Resume Interview
              </Button>
              <Button variant="destructive" onClick={handleEndInterview}>
                Exit Now
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {isInterviewComplete && finalReport ? (
          /* ── FINAL REPORT SCREEN ───────────────────────────── */
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Score Card */}
            <Card className="p-8 border-border/80 text-center relative overflow-hidden bg-card shadow-sm">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />
              <div className="text-4xl mb-2">🎓</div>
              <h2 className="text-2xl font-black text-foreground">Interview Performance Report</h2>
              <p className="text-xs text-muted-foreground mt-1 mb-6">
                Domain: <span className="font-semibold text-foreground">{domain}</span> • Duration:{" "}
                <span className="font-semibold text-foreground">{formatTime(elapsedSeconds)}</span>
              </p>

              <ScoreRing score={finalReport.overallScore} />

              <p className="text-sm font-semibold mt-4 text-foreground">
                {finalReport.overallScore >= 80
                  ? "🎉 Excellent Performance! Ready for Senior Level Roles."
                  : finalReport.overallScore >= 60
                  ? "💪 Good Effort! Solid Core Understanding Demonstrated."
                  : "📚 Practice Recommended to Strengthen Technical Depth."}
              </p>

              {/* Summary Paragraph */}
              <p className="text-xs text-muted-foreground max-w-xl mx-auto mt-3 bg-muted/40 p-3 rounded-lg border border-border/40">
                {finalReport.summary}
              </p>
            </Card>

            {/* ── COMPANY SIMULATION SUMMARY ───────────────────────────── */}
            {finalReport.companySimulationSummary && (
              <Card className="p-6 border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-accent/5 shadow-md space-y-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl shrink-0">
                      🏢
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        {finalReport.companySimulationSummary.selectedCompany} Recruiter Simulation Summary
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Interview Style: <span className="font-semibold text-foreground">{finalReport.companySimulationSummary.interviewStyle}</span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-auto ${
                      finalReport.companySimulationSummary.expectationMatch === "Meets Simulated Expectations"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : finalReport.companySimulationSummary.expectationMatch === "Close to Expected Level"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    }`}
                  >
                    🎯 {finalReport.companySimulationSummary.expectationMatch}
                  </span>
                </div>

                {/* Feedback Paragraph */}
                <div className="p-3.5 rounded-xl bg-background/80 border border-border/60 text-xs text-foreground leading-relaxed">
                  <p className="font-bold text-primary mb-1">Simulated Company Feedback:</p>
                  {finalReport.companySimulationSummary.companyFeedback}
                </div>

                {/* Metrics breakdown */}
                {finalReport.companySimulationSummary.companyMetrics && (
                  <div>
                    <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
                      <span>📊</span> Company Specific Evaluation Criteria Breakdown
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {Object.entries(finalReport.companySimulationSummary.companyMetrics).map(([key, val]) => {
                        if (val === undefined || val === null) return null;
                        const labelMap: Record<string, string> = {
                          problemSolving: "Problem Solving",
                          technicalDepth: "Technical Depth",
                          optimization: "Optimization & Complexity",
                          communication: "Communication & Clarity",
                          practicalReasoning: "Practical Reasoning",
                          behavioral: "Behavioral & STAR Format",
                          systemDesign: "System & Architecture Thinking",
                        };
                        return (
                          <div key={key} className="p-2.5 rounded-lg bg-background border border-border/50">
                            <div className="flex justify-between font-semibold mb-1">
                              <span className="text-muted-foreground">{labelMap[key] || key}</span>
                              <span className="text-primary font-bold">{val}%</span>
                            </div>
                            <div className="h-1.5 bg-border rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                                style={{ width: `${val}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Improvement Topics */}
                {finalReport.companySimulationSummary.improvementTopics && (
                  <div>
                    <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                      <span>🎯</span> Topics to Improve for {finalReport.companySimulationSummary.selectedCompany} Profile
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {finalReport.companySimulationSummary.improvementTopics.map((topic, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 font-medium"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Overall Score", val: `${finalReport.overallScore}%`, icon: "🏆" },
                { label: "Questions Attempted", val: finalReport.totalQuestions, icon: "❓" },
                { label: "Strong Answers", val: finalReport.strongCount, icon: "✅" },
                { label: "Weak Answers", val: finalReport.weakCount, icon: "⚠️" },
                { label: "Skipped", val: finalReport.skippedCount, icon: "⏭️" },
                { label: "Repeated Answers", val: finalReport.repeatedCount, icon: "🔁" },
                { label: "Starting Level", val: finalReport.startingDifficulty, icon: "🟢" },
                { label: "Peak Difficulty", val: finalReport.highestDifficulty, icon: "🚀" },
              ].map((m, i) => (
                <Card key={i} className="p-3 text-center border-border/60">
                  <span className="text-lg">{m.icon}</span>
                  <p className="text-lg font-bold text-foreground mt-1">{m.val}</p>
                  <p className="text-[11px] text-muted-foreground">{m.label}</p>
                </Card>
              ))}
            </div>

            {/* Difficulty Progression Path */}
            <Card className="p-6 border-border/60">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <span>📈</span> Adaptive Difficulty Progression
              </h3>
              <div className="space-y-3">
                {finalReport.difficultyProgression && finalReport.difficultyProgression.length > 0 ? (
                  finalReport.difficultyProgression.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40 text-xs"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                        {item.questionIndex || idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            Question {item.questionIndex || idx + 1}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.difficulty === 3
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                                : item.difficulty === 2
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                        {item.reason && (
                          <p className="text-muted-foreground text-[11px] mt-1">{item.reason}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Progression tracked per question response.</p>
                )}
              </div>
            </Card>

            {/* Topic Performance */}
            {finalReport.topicScores && finalReport.topicScores.length > 0 && (
              <Card className="p-6 border-border/60">
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <span>🎯</span> Topic Performance Breakdown
                </h3>
                <div className="space-y-3">
                  {finalReport.topicScores.map((ts, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{ts.topic}</span>
                        <span className="font-bold text-foreground">{ts.score}%</span>
                      </div>
                      <div className="h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
                          style={{ width: `${ts.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Question-by-Question Detailed Accordion */}
            {finalReport.questions && finalReport.questions.length > 0 && (
              <Card className="p-6 border-border/60">
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <span>📝</span> Question-by-Question Breakdown
                </h3>
                <div className="space-y-3">
                  {finalReport.questions.map((q, idx) => {
                    const isExpanded = expandedQuestion === idx;
                    return (
                      <div
                        key={idx}
                        className="border border-border/60 rounded-xl overflow-hidden bg-background"
                      >
                        <button
                          onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
                          className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-xs text-primary shrink-0">Q{idx + 1}</span>
                            <p className="text-xs font-semibold text-foreground truncate">{q.questionText}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                q.skipped
                                  ? "bg-gray-500/10 text-gray-500 border-gray-500/30"
                                  : q.score! >= 8
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : q.score! >= 5
                                  ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              }`}
                            >
                              {q.skipped ? "Skipped" : `Score: ${q.score}/10`}
                            </span>
                            <span className="text-xs text-muted-foreground">{isExpanded ? "▲" : "▼"}</span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-border/40 bg-muted/20 space-y-3 text-xs">
                            <div className="pt-2">
                              <span className="font-bold text-muted-foreground">Topic:</span>{" "}
                              <span className="text-foreground font-semibold">{q.topic || domain}</span>
                            </div>

                            <div>
                              <span className="font-bold text-muted-foreground">Candidate Answer:</span>
                              <p className="mt-1 p-2.5 rounded-md bg-background border border-border/60 text-foreground italic">
                                {q.skipped ? "Question was skipped." : q.answer || "No response."}
                              </p>
                            </div>

                            {q.strengths && q.strengths.length > 0 && (
                              <div>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">Strengths:</span>
                                <ul className="list-disc list-inside mt-1 text-muted-foreground space-y-0.5">
                                  {q.strengths.map((s, i) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {q.weaknesses && q.weaknesses.length > 0 && (
                              <div>
                                <span className="font-bold text-amber-600 dark:text-amber-400">Areas to Improve:</span>
                                <ul className="list-disc list-inside mt-1 text-muted-foreground space-y-0.5">
                                  {q.weaknesses.map((w, i) => (
                                    <li key={i}>{w}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {q.decisionReason && (
                              <div className="p-2 rounded bg-primary/5 text-primary text-[11px] font-medium border border-primary/20">
                                💡 Engine Decision: {q.decisionReason}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Revision Suggestions */}
            {finalReport.revisionTopics && finalReport.revisionTopics.length > 0 && (
              <Card className="p-6 border-border/60">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <span>💡</span> Recommended Revision Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {finalReport.revisionTopics.map((rt, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 font-medium"
                    >
                      {rt}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem("active_interview_session");
                  startNewInterview();
                }}
                className="rounded-full px-6"
              >
                🔄 Try Another Session
              </Button>
              <Button
                onClick={handleEndInterview}
                className="rounded-full px-8 bg-gradient-to-r from-primary to-accent text-white font-bold"
              >
                Go to Dashboard →
              </Button>
            </div>
          </div>
        ) : activeFeedback ? (
          /* ── ANSWER FEEDBACK CARD / MODAL ─────────────────────── */
          <Card className="p-6 sm:p-8 border-border shadow-md space-y-6 animate-in fade-in duration-300 bg-card">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <h3 className="text-lg font-bold text-foreground">Answer Evaluation</h3>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black border ${
                  activeFeedback.score >= 8
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    : activeFeedback.score >= 5
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                }`}
              >
                Score: {activeFeedback.score} / 10 ({activeFeedback.classification})
              </span>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <span>✅</span> Key Strengths
                </h4>
                <ul className="space-y-1">
                  {activeFeedback.strengths.map((s, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-emerald-500 shrink-0">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <span>💡</span> Areas to Improve
                </h4>
                <ul className="space-y-1">
                  {activeFeedback.weaknesses.map((w, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-amber-500 shrink-0">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Difficulty Engine Decision */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                ⚙️ Adaptive Engine Decision
              </span>
              <p className="text-xs font-medium text-foreground">{activeFeedback.difficultyDecision}</p>
            </div>

            <Button
              onClick={handleContinueNextQuestion}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold hover:opacity-90 transition-opacity"
            >
              Continue to Next Question →
            </Button>
          </Card>
        ) : (
          /* ── ACTIVE QUESTION & ANSWER INTERFACE ───────────────── */
          <div className="space-y-6">
            {/* Repeated Answer Warning Alert */}
            {warningMessage && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5 animate-in slide-in-from-top duration-300">
                <span className="text-base shrink-0">⚠️</span>
                <div className="flex-1">
                  <p className="font-bold">Repeated Answer Warning</p>
                  <p className="mt-0.5">{warningMessage}</p>
                </div>
              </div>
            )}

            {/* Submission Error Alert */}
            {submitError && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2.5 animate-in slide-in-from-top duration-300">
                <span className="text-base shrink-0">❌</span>
                <div className="flex-1">
                  <p className="font-bold">Submission Error</p>
                  <p className="mt-0.5">{submitError}</p>
                </div>
              </div>
            )}

            {/* Question Card */}
            <Card className="p-6 sm:p-8 border-border shadow-sm space-y-4 bg-card relative overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                    Question {questionsAnswered + 1} of {TOTAL_QUESTIONS}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground px-2.5 py-1 rounded-full bg-muted border border-border">
                    Topic: {currentTopic}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                    DIFFICULTY_CONFIG[currentDifficulty]?.bg
                  } ${DIFFICULTY_CONFIG[currentDifficulty]?.text} ${
                    DIFFICULTY_CONFIG[currentDifficulty]?.border
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${DIFFICULTY_CONFIG[currentDifficulty]?.dot}`}
                  />
                  {DIFFICULTY_CONFIG[currentDifficulty]?.label} Level
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-foreground leading-relaxed pt-2">
                {currentQuestionText || "Preparing your technical question..."}
              </h2>
            </Card>

            {/* Candidate Answer Form */}
            <Card className="p-6 border-border shadow-sm space-y-4 bg-card">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Your Answer</span>
                  <span className="text-muted-foreground font-normal">
                    Provide clear explanations and examples
                  </span>
                </label>
                <textarea
                  rows={6}
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="Explain your approach, technical concepts, implementation details, and any real-world trade-offs..."
                  disabled={isLoading}
                  className="w-full p-4 rounded-xl bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none transition-all disabled:opacity-50"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleSkipQuestion}
                  disabled={isLoading}
                  className="rounded-xl border-border hover:bg-muted text-muted-foreground text-xs font-semibold px-4"
                >
                  ⏭️ Skip Question
                </Button>

                <Button
                  onClick={handleAnswerSubmit}
                  disabled={isLoading || !answerInput.trim()}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold text-sm px-6 py-2.5 transition-all shadow-md disabled:opacity-50"
                >
                  {isLoading ? "Evaluating Answer..." : "Submit Answer →"}
                </Button>
              </div>
            </Card>

            {/* Tip Footer */}
            <p className="text-xs text-muted-foreground text-center">
              💡 Tip: Strong answers automatically unlock more advanced follow-up questions!
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#3b82f6" : "#f97316";

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-border/60"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-foreground">{score}%</span>
        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
          Overall
        </span>
      </div>
    </div>
  );
}

export default InterviewContent;
