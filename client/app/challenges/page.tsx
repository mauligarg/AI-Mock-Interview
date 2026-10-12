"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";

export default function ChallengeArenaPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"sprints" | "leaderboard" | "badges" | "analytics" | "history">("sprints");
  const [leaderboardTab, setLeaderboardTab] = useState<"daily" | "weekly" | "alltime">("alltime");

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [historyAttempts, setHistoryAttempts] = useState<any[]>([]);
  const [startingChallengeId, setStartingChallengeId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchArenaData();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && activeTab === "leaderboard") {
      fetchLeaderboard(leaderboardTab);
    }
  }, [isLoggedIn, activeTab, leaderboardTab]);

  const fetchArenaData = async () => {
    try {
      setLoading(true);
      const [overviewRes, profileRes, historyRes] = await Promise.all([
        axiosInstance.get("/api/challenges/overview"),
        axiosInstance.get("/api/gamification/profile"),
        axiosInstance.get("/api/gamification/history"),
      ]);

      setOverview(overviewRes.data);
      setProfileData(profileRes.data);
      setHistoryAttempts(historyRes.data.attempts || []);
    } catch (err) {
      console.error("Failed to load arena data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (period: string) => {
    try {
      const { data } = await axiosInstance.get(`/api/gamification/leaderboard?period=${period}`);
      setLeaderboardData(data);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    }
  };

  const handleStartChallenge = async (challengeId: string) => {
    try {
      setStartingChallengeId(challengeId);
      const { data } = await axiosInstance.post(`/api/challenges/${challengeId}/start`);
      router.push(`/challenges/${data.challenge._id}?attemptId=${data.attemptId}`);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to start challenge");
    } finally {
      setStartingChallengeId(null);
    }
  };

  const handleStartPractice = async (category: string) => {
    try {
      setLoading(true);
      const { data: pracRes } = await axiosInstance.post("/api/challenges/practice", { category });
      const { data: startRes } = await axiosInstance.post(`/api/challenges/${pracRes.challenge._id}/start`);
      router.push(`/challenges/${startRes.challenge._id}?attemptId=${startRes.attemptId}`);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to start practice challenge");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !isLoggedIn) return null;

  const prof = profileData?.profile || {};
  const badges = profileData?.badges || [];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── HEADER BANNER ────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-primary/10 to-orange-500/10 border border-primary/20 p-6 sm:p-8 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🏆</span>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground">Peer Challenge Arena</h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                Compete against candidates worldwide in AI-generated interview sprints, earn XP, unlock rank badges & track your competitive standing.
              </p>
            </div>

            {/* Stats Snapshot Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-background/80 backdrop-blur border border-border/60 p-4 rounded-2xl">
              <div className="text-center px-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Rank</p>
                <p className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">{prof.currentRank || "Bronze III"}</p>
              </div>

              <div className="text-center px-2 border-l border-border/40">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total XP</p>
                <p className="text-base font-black text-primary mt-0.5">✨ {prof.totalXP || 0}</p>
              </div>

              <div className="text-center px-2 border-l border-border/40">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Streak</p>
                <p className="text-base font-black text-orange-500 mt-0.5">🔥 {prof.currentStreak || 0} Days</p>
              </div>

              <div className="text-center px-2 border-l border-border/40">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Leaderboard</p>
                <p className="text-base font-black text-foreground mt-0.5">#{prof.leaderboardPosition || 1} <span className="text-[10px] text-muted-foreground font-normal">of {prof.totalParticipants || 1}</span></p>
              </div>
            </div>
          </div>
        </section>

        {/* ── NAVIGATION TABS ──────────────────────────────────────── */}
        <section className="flex items-center gap-1 border-b border-border/60 overflow-x-auto pb-px">
          {[
            { id: "sprints", label: "⚡ Active Sprints", icon: "⚡" },
            { id: "leaderboard", label: "🏆 Leaderboard", icon: "🏆" },
            { id: "badges", label: "🎖️ Achievements", icon: "🎖️" },
            { id: "analytics", label: "📈 Rank History & Percentile", icon: "📈" },
            { id: "history", label: "📋 Challenge History", icon: "📋" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary bg-primary/5 rounded-t-xl"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </section>

        {/* ── TAB 1: ACTIVE SPRINTS ────────────────────────────────── */}
        {activeTab === "sprints" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Daily Challenge Card */}
              {overview?.dailyChallenge && (
                <Card className="p-6 border-amber-500/30 bg-card hover:shadow-lg transition-all space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-white font-bold text-[10px] uppercase rounded-bl-xl tracking-wider">
                    Daily Challenge
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-2xl flex items-center justify-center shrink-0 border border-amber-500/20">
                      ⚡
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">{overview.dailyChallenge.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Category: <span className="font-semibold text-foreground">{overview.dailyChallenge.category}</span> • Difficulty:{" "}
                        <span className="font-semibold text-foreground">{overview.dailyChallenge.difficulty}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs bg-muted/30 rounded-xl border border-border/40">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Questions</p>
                      <p className="font-bold text-foreground">{overview.dailyChallenge.questions?.length || 5}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Time Limit</p>
                      <p className="font-bold text-foreground">{overview.dailyChallenge.timeLimitMinutes || 10} Mins</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Reward</p>
                      <p className="font-bold text-amber-500">+{overview.dailyChallenge.xpReward || 100} XP</p>
                    </div>
                  </div>

                  {overview.dailyChallenge.completed ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold text-center flex items-center justify-between">
                      <span>✅ Completed for Today!</span>
                      <span>Score: {overview.dailyChallenge.attempt?.score} pts</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleStartChallenge(overview.dailyChallenge._id)}
                      disabled={startingChallengeId === overview.dailyChallenge._id}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:opacity-90 shadow-md"
                    >
                      {startingChallengeId === overview.dailyChallenge._id ? "Preparing Sprint..." : "Start Daily Challenge →"}
                    </Button>
                  )}
                </Card>
              )}

              {/* Weekly Challenge Card */}
              {overview?.weeklyChallenge && (
                <Card className="p-6 border-purple-500/30 bg-card hover:shadow-lg transition-all space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-purple-600 text-white font-bold text-[10px] uppercase rounded-bl-xl tracking-wider">
                    Weekly Sprint
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black text-2xl flex items-center justify-center shrink-0 border border-purple-500/20">
                      🏆
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">{overview.weeklyChallenge.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Categories: <span className="font-semibold text-foreground">Technical + HR + Aptitude</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs bg-muted/30 rounded-xl border border-border/40">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Questions</p>
                      <p className="font-bold text-foreground">{overview.weeklyChallenge.questions?.length || 15}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Time Limit</p>
                      <p className="font-bold text-foreground">{overview.weeklyChallenge.timeLimitMinutes || 30} Mins</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Reward</p>
                      <p className="font-bold text-purple-500">+{overview.weeklyChallenge.xpReward || 500} XP</p>
                    </div>
                  </div>

                  {overview.weeklyChallenge.completed ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold text-center flex items-center justify-between">
                      <span>✅ Completed for This Week!</span>
                      <span>Score: {overview.weeklyChallenge.attempt?.score} pts</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleStartChallenge(overview.weeklyChallenge._id)}
                      disabled={startingChallengeId === overview.weeklyChallenge._id}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold hover:opacity-90 shadow-md"
                    >
                      {startingChallengeId === overview.weeklyChallenge._id ? "Preparing Sprint..." : "Start Weekly Sprint →"}
                    </Button>
                  )}
                </Card>
              )}
            </div>

            {/* Category Practice Sprints */}
            <div>
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <span>🎯</span> Practice Category Sprints
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    cat: "HR",
                    title: "HR & Behavioral",
                    desc: "Conflict resolution, leadership, STAR behavioral feedback",
                    icon: "💬",
                    badge: "+50 XP",
                  },
                  {
                    cat: "Technical",
                    title: "Core Technical",
                    desc: "DSA, OOP, DBMS, OS, Computer Networks & coding",
                    icon: "💻",
                    badge: "+50 XP",
                  },
                  {
                    cat: "Aptitude",
                    title: "Aptitude & Logic",
                    desc: "Quantitative reasoning, time & work, probability MCQs",
                    icon: "🧠",
                    badge: "+50 XP",
                  },
                  {
                    cat: "Domain-Specific",
                    title: "Domain Specialist",
                    desc: "Frontend, Backend, Java, React & Architecture",
                    icon: "⚡",
                    badge: "+50 XP",
                  },
                ].map((item) => (
                  <Card key={item.cat} className="p-5 border-border/60 hover:border-primary/40 transition-all flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">
                          {item.badge}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleStartPractice(item.cat)}
                      className="w-full text-xs font-bold rounded-xl border-border hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      Start {item.cat} Practice
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: LEADERBOARD ───────────────────────────────────── */}
        {activeTab === "leaderboard" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>🏆</span> Global Competitor Leaderboard
                </h2>
                <p className="text-xs text-muted-foreground">
                  You are currently <span className="font-bold text-primary">#{leaderboardData?.currentUserPosition || 1}</span> out of {leaderboardData?.totalParticipants || 1} participants
                </p>
              </div>

              {/* Sub-tabs: Daily / Weekly / All-Time */}
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/60 self-start sm:self-auto">
                {(["daily", "weekly", "alltime"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setLeaderboardTab(period)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                      leaderboardTab === period
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {period === "alltime" ? "All-Time" : period}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaderboard Table */}
            <Card className="border-border/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider border-b border-border/60">
                    <tr>
                      <th className="p-3.5 text-center w-16">Rank</th>
                      <th className="p-3.5">Candidate</th>
                      <th className="p-3.5 text-center">Rank Tier</th>
                      <th className="p-3.5 text-center">Streak</th>
                      <th className="p-3.5 text-center">Challenges</th>
                      <th className="p-3.5 text-right">Total XP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {leaderboardData?.leaderboard?.map((item: any) => (
                      <tr
                        key={item.userId}
                        className={`transition-colors ${
                          item.isCurrentUser ? "bg-primary/10 font-bold text-foreground" : "hover:bg-muted/30"
                        }`}
                      >
                        <td className="p-3.5 text-center font-black text-sm">
                          {item.rankPosition === 1 ? (
                            <span className="text-amber-500">🥇 1</span>
                          ) : item.rankPosition === 2 ? (
                            <span className="text-gray-400">🥈 2</span>
                          ) : item.rankPosition === 3 ? (
                            <span className="text-amber-700">🥉 3</span>
                          ) : (
                            `#${item.rankPosition}`
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center font-bold text-primary">
                              {item.displayName.charAt(0)}
                            </div>
                            <span className="font-semibold text-foreground truncate">{item.displayName}</span>
                            {item.isCurrentUser && (
                              <span className="text-[10px] bg-primary text-white font-bold px-2 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-muted border border-border">
                            {item.rank}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-semibold text-orange-500">
                          🔥 {item.streak}d
                        </td>
                        <td className="p-3.5 text-center font-medium">{item.completedChallenges}</td>
                        <td className="p-3.5 text-right font-black text-primary text-sm">
                          ✨ {item.totalXP}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── TAB 3: ACHIEVEMENTS ──────────────────────────────────── */}
        {activeTab === "badges" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>🎖️</span> My Achievement Badges
              </h2>
              <p className="text-xs text-muted-foreground">
                Earn badges automatically by hitting performance milestones in daily, weekly, and practice challenges.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map((badge: any) => (
                <Card
                  key={badge.badgeId}
                  className={`p-4 border transition-all flex items-start gap-3.5 ${
                    badge.unlocked
                      ? "border-amber-500/40 bg-amber-500/5 shadow-sm"
                      : "border-border/40 opacity-60 bg-muted/20"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border ${
                      badge.unlocked ? "bg-amber-500/20 border-amber-500/40 text-amber-500" : "bg-muted border-border text-muted-foreground grayscale"
                    }`}
                  >
                    {badge.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-xs font-bold text-foreground truncate">{badge.title}</h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          badge.unlocked ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {badge.unlocked ? "Unlocked" : "Locked"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{badge.description}</p>
                    {badge.unlocked && badge.unlockedAt && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-2">
                        Unlocked on {new Date(badge.unlockedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 4: RANK HISTORY & ANALYTICS ─────────────────────── */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Peer Comparison Box */}
              <Card className="p-6 border-primary/30 bg-primary/5 space-y-2 col-span-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Peer Percentile Standing</p>
                <p className="text-3xl font-black text-primary">Top {100 - (prof.percentile || 90)}%</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You performed better than <span className="font-bold text-foreground">{prof.percentile || 72}%</span> of registered candidates across all challenge categories!
                </p>
              </Card>

              {/* Best Category */}
              <Card className="p-6 border-border/60 space-y-2 col-span-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Best Performing Category</p>
                <p className="text-3xl font-black text-amber-500">{prof.bestCategory || "Technical"}</p>
                <p className="text-xs text-muted-foreground">Highest average accuracy & score consistency in recent challenge sprints.</p>
              </Card>

              {/* Longest Streak */}
              <Card className="p-6 border-border/60 space-y-2 col-span-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Longest Streak</p>
                <p className="text-3xl font-black text-orange-500">🔥 {prof.longestStreak || 0} Days</p>
                <p className="text-xs text-muted-foreground">Personal best consecutive activity record in the Challenge Arena.</p>
              </Card>
            </div>

            {/* Rank History Snapshot Timeline */}
            <Card className="p-6 border-border/60 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>📈</span> Historical Ranking Progression
              </h3>
              {profileData?.rankHistory && profileData.rankHistory.length > 0 ? (
                <div className="space-y-3">
                  {profileData.rankHistory.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/40 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                          #{item.leaderboardPosition || idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-foreground">{item.periodLabel || "Sprint Snapshot"}</p>
                          <p className="text-[11px] text-muted-foreground">{new Date(item.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="font-bold text-amber-500">{item.rank}</p>
                          <p className="text-[10px] text-muted-foreground">Percentile: {item.percentile}%</p>
                        </div>
                        <span className="font-black text-primary text-sm">✨ {item.xp} XP</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Complete your first challenge to generate rank history snapshots!</p>
              )}
            </Card>
          </div>
        )}

        {/* ── TAB 5: CHALLENGE HISTORY ────────────────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>📋</span> My Challenge History
            </h2>

            {historyAttempts.length > 0 ? (
              <div className="space-y-3">
                {historyAttempts.map((att) => (
                  <Card key={att._id} className="p-5 border-border/60 hover:border-primary/40 transition-all text-xs space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-xs font-bold text-foreground">
                          {att.challengeId?.title || `${att.category} Challenge`}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-full bg-muted font-semibold text-[10px]">
                            Category: {att.category}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            📅 {new Date(att.completedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-black text-sm text-primary">{att.score} / {att.maxScore} pts</p>
                          <p className="text-[10px] text-muted-foreground">Accuracy: {att.accuracy}%</p>
                        </div>
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold rounded-full border border-amber-500/30 text-xs">
                          +{att.xpEarned} XP
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center border-2 border-dashed border-border text-muted-foreground text-xs">
                No challenges completed yet. Start a Daily or Practice challenge to record history!
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
