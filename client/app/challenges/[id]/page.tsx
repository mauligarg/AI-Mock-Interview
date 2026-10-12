"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function ChallengeAttemptForm() {
  const params = useParams();
  const challengeId = params.id as string;
  const searchParams = useSearchParams();
  const attemptIdParam = searchParams.get("attemptId");

  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [challenge, setChallenge] = useState<any>(null);
  const [attemptId, setAttemptId] = useState<string>(attemptIdParam || "");

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, { userAnswer?: string; selectedOptionId?: string; skipped?: boolean }>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [resultData, setResultData] = useState<any>(null);

  // Timer Effect
  useEffect(() => {
    if (isCompleted || !challenge) return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isCompleted, challenge]);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (isLoggedIn && challengeId) {
      initChallengeAttempt();
    }
  }, [isLoggedIn, challengeId]);

  const initChallengeAttempt = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.post(`/api/challenges/${challengeId}/start`);
      setChallenge(data.challenge);
      setAttemptId(data.attemptId);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to start challenge attempt");
      router.push("/challenges");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selectedOptionId: optionId,
        skipped: false,
      },
    }));
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        userAnswer: text,
        skipped: false,
      },
    }));
  };

  const handleSkip = (questionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        skipped: true,
      },
    }));
    if (currentIndex < (challenge?.questions?.length || 1) - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleSubmitChallenge = async () => {
    try {
      setSubmitting(true);
      const questions = challenge?.questions || [];
      const payloadAnswers = questions.map((q: any) => {
        const userEntry = answers[q.questionId] || {};
        return {
          questionId: q.questionId,
          userAnswer: userEntry.userAnswer || "",
          selectedOptionId: userEntry.selectedOptionId || "",
          skipped: !!userEntry.skipped,
        };
      });

      const { data } = await axiosInstance.post(`/api/challenges/${challengeId}/complete`, {
        attemptId,
        answers: payloadAnswers,
        timeTakenSeconds: elapsedSeconds,
      });

      setResultData(data);
      setIsCompleted(true);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to submit challenge attempt");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (authLoading || !isLoggedIn || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Preparing Challenge Arena...</p>
        </div>
      </div>
    );
  }

  const questions = challenge?.questions || [];
  const currentQ = questions[currentIndex];
  const totalQ = questions.length;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {isCompleted && resultData ? (
          /* ── CHALLENGE RESULT VIEW ────────────────────────────── */
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Result Banner */}
            <Card className="p-8 border-border text-center relative overflow-hidden bg-card shadow-md space-y-4">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-primary to-purple-500" />
              <div className="text-5xl">🏆</div>
              <h1 className="text-2xl font-black text-foreground">{challenge?.title} Completed!</h1>
              <p className="text-xs text-muted-foreground">
                Category: <span className="font-semibold text-foreground">{challenge?.category}</span> • Time Taken:{" "}
                <span className="font-semibold text-foreground">{formatTime(resultData.timeTakenSeconds)}</span>
              </p>

              {/* Unlocked Badges Banner */}
              {resultData.unlockedBadges && resultData.unlockedBadges.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold space-y-2 animate-bounce">
                  <p className="flex items-center justify-center gap-2 text-sm">
                    <span>🎉</span> NEW ACHIEVEMENT BADGE UNLOCKED! <span>🎉</span>
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {resultData.unlockedBadges.map((b: any) => (
                      <span key={b.badgeId} className="px-3 py-1 bg-amber-500 text-white rounded-full flex items-center gap-1.5 shadow-sm">
                        <span>{b.icon}</span> {b.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Result Numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Challenge Score</p>
                  <p className="text-xl font-black text-primary mt-1">{resultData.score} / {resultData.maxScore}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Accuracy</p>
                  <p className="text-xl font-black text-emerald-500 mt-1">{resultData.accuracy}%</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">XP Earned</p>
                  <p className="text-xl font-black text-amber-500 mt-1">+{resultData.xpEarned} XP</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Leaderboard Rank</p>
                  <p className="text-xl font-black text-purple-500 mt-1">
                    #{resultData.leaderboardPosition}{" "}
                    {resultData.rankMovement > 0 && (
                      <span className="text-xs text-emerald-500 font-bold">▲ +{resultData.rankMovement}</span>
                    )}
                  </p>
                </div>
              </div>
            </Card>

            {/* Question Breakdown Accordion */}
            <Card className="p-6 border-border space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>📝</span> Question Breakdown & Feedback
              </h3>
              <div className="space-y-3">
                {resultData.answers?.map((ans: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-muted/20 border border-border/60 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-primary">Question {idx + 1}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          ans.isCorrect || ans.score >= 75
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : ans.score >= 50
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        }`}
                      >
                        {ans.skipped ? "Skipped" : `Score: ${ans.score} pts`}
                      </span>
                    </div>
                    <p className="font-bold text-foreground">{ans.questionText}</p>
                    {ans.questionType === "mcq" ? (
                      <p className="text-muted-foreground">
                        Selected Option: <span className="font-semibold text-foreground">{ans.selectedOptionId || "None"}</span> •{" "}
                        <span className={ans.isCorrect ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                          {ans.isCorrect ? "Correct Option" : "Incorrect"}
                        </span>
                      </p>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-background border border-border/60 text-muted-foreground italic">
                        "{ans.userAnswer || "No response provided."}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-center gap-3 pt-4">
              <Button onClick={() => router.push("/challenges")} className="rounded-full px-8 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold">
                🏆 Back to Challenge Arena →
              </Button>
            </div>
          </div>
        ) : (
          /* ── LIVE CHALLENGE ATTEMPT VIEW ───────────────────────── */
          <div className="space-y-6">
            {/* Live Header Bar */}
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-border/60">
              <div>
                <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {challenge?.category} Sprint
                </span>
                <h2 className="text-lg font-bold text-foreground mt-1">{challenge?.title}</h2>
              </div>
              <div className="flex items-center gap-2 bg-muted/60 border border-border px-3.5 py-1.5 rounded-full font-mono text-sm font-bold text-foreground">
                <span>⏱</span>
                <span>{formatTime(elapsedSeconds)}</span>
              </div>
            </div>

            {/* Question Card */}
            <Card className="p-6 sm:p-8 border-border shadow-sm space-y-6 bg-card">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-bold text-primary">
                  Question {currentIndex + 1} of {totalQ}
                </span>
                <span>Topic: {currentQ?.topic}</span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-foreground leading-relaxed">
                {currentQ?.questionText}
              </h3>

              {/* Question Input: MCQ vs Subjective */}
              {currentQ?.type === "mcq" ? (
                <div className="space-y-2.5 pt-2">
                  {currentQ.options?.map((opt: any) => {
                    const isSelected = answers[currentQ.questionId]?.selectedOptionId === opt.optionId;
                    return (
                      <button
                        key={opt.optionId}
                        onClick={() => handleSelectOption(currentQ.questionId, opt.optionId)}
                        className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-center gap-3 ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20"
                            : "border-border/60 hover:border-amber-500/40 hover:bg-muted/30 text-foreground"
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center border ${
                          isSelected ? "bg-amber-500 text-white border-amber-500" : "bg-muted text-muted-foreground border-border"
                        }`}>
                          {opt.optionId}
                        </span>
                        <span>{opt.optionText}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  <textarea
                    rows={5}
                    value={answers[currentQ?.questionId]?.userAnswer || ""}
                    onChange={(e) => handleTextAnswer(currentQ?.questionId, e.target.value)}
                    placeholder="Type your structured answer here (include examples, trade-offs, and key mechanisms)..."
                    className="w-full p-4 rounded-xl bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm text-foreground outline-none resize-none"
                  />
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/40">
                <Button
                  variant="outline"
                  onClick={() => handleSkip(currentQ?.questionId)}
                  className="rounded-xl text-xs font-semibold text-muted-foreground"
                >
                  ⏭️ Skip
                </Button>

                <div className="flex items-center gap-2">
                  {currentIndex > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentIndex((i) => i - 1)}
                      className="rounded-xl text-xs"
                    >
                      ← Previous
                    </Button>
                  )}

                  {currentIndex < totalQ - 1 ? (
                    <Button
                      onClick={() => setCurrentIndex((i) => i + 1)}
                      className="rounded-xl bg-primary text-primary-foreground font-bold text-xs px-5"
                    >
                      Next Question →
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmitChallenge}
                      disabled={submitting}
                      className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs px-6 shadow-md"
                    >
                      {submitting ? "Calculating Results..." : "Submit Challenge Sprints →"}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ChallengeAttemptPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ChallengeAttemptForm />
    </Suspense>
  );
}
