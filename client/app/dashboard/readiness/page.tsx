"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ComponentScores {
  interviewPerformance: number;
  resumeStrength: number;
  skillMatch: number;
  communication: number;
}

interface RoadmapPhase {
  phase: string;
  duration: string;
  tasks: string[];
}

interface ProjectRecommendation {
  title: string;
  skills: string[];
  description: string;
  why: string;
}

interface CertificationRecommendation {
  title: string;
  provider: string;
  isOptional: boolean;
}

interface TopicPriority {
  topic: string;
  priority: "High" | "Medium" | "Low";
}

interface HistoryItem {
  score: number;
  classification: string;
  componentScores: ComponentScores;
  weakAreas: string[];
  missingSkills: string[];
  generatedAt: string;
}

interface ReadinessReportData {
  _id?: string;
  currentScore: number;
  classification: "Needs Improvement" | "High Potential Candidate" | "Placement Ready";
  candidateType: "Fresher" | "Internship Seeker" | "Experienced Candidate";
  targetDomain: string;
  components: ComponentScores;
  strongAreas: string[];
  weakAreas: string[];
  missingSkills: string[];
  communicationGaps: string[];
  roadmap: RoadmapPhase[];
  recommendedTechnologies: string[];
  recommendedProjects: ProjectRecommendation[];
  recommendedCertifications: CertificationRecommendation[];
  interviewTopics: TopicPriority[];
  history: HistoryItem[];
  updatedAt: string;
}

const statusBadgeStyles: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  "Placement Ready": {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/30",
    icon: "🌟",
  },
  "High Potential Candidate": {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-500/30",
    icon: "⚡",
  },
  "Needs Improvement": {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500/30",
    icon: "📈",
  },
};

const priorityStyles: Record<string, { bg: string; text: string; border: string }> = {
  High: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30" },
  Medium: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  Low: { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/30" },
};

export default function ReadinessReportPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [readiness, setReadiness] = useState<ReadinessReportData | null>(null);
  const [hasInterviews, setHasInterviews] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [selectedCandidateType, setSelectedCandidateType] = useState<
    "Fresher" | "Internship Seeker" | "Experienced Candidate"
  >("Fresher");

  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchReadinessReport();
    }
  }, [isLoggedIn]);

  const fetchReadinessReport = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/api/readiness");
      if (response.data && response.data.readiness) {
        setReadiness(response.data.readiness);
        setHasInterviews(response.data.hasInterviews);
        setHasResume(response.data.hasResume);
        setSelectedCandidateType(response.data.readiness.candidateType || "Fresher");
      }
    } catch (error) {
      console.error("Failed to fetch readiness report", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCandidateTypeChange = async (
    type: "Fresher" | "Internship Seeker" | "Experienced Candidate"
  ) => {
    try {
      setIsUpdating(true);
      setSelectedCandidateType(type);

      const response = await axiosInstance.put("/api/readiness/candidate-type", {
        candidateType: type,
        targetDomain: readiness?.targetDomain || "General",
      });

      if (response.data && response.data.readiness) {
        const updatedReadiness = response.data.readiness;
        console.log("candidate type response:", updatedReadiness);
        setReadiness(updatedReadiness);

        if (updatedReadiness.candidateType) {
          setSelectedCandidateType(updatedReadiness.candidateType);
        }
      }
    } catch (error) {
      console.error("Failed to update candidate type", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent animate-spin flex items-center justify-center text-white text-xl">
          ⚡
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Generating your Placement Readiness Analytics…
        </p>
      </div>
    );
  }

  console.log("roadmap being rendered:", readiness?.roadmap);
  console.log("projects being rendered:", readiness?.recommendedProjects);

  const score = readiness?.currentScore || 0;
  const classification = readiness?.classification || "Needs Improvement";
  const badge = statusBadgeStyles[classification] || statusBadgeStyles["Needs Improvement"];
  const comps = readiness?.components || {
    interviewPerformance: 0,
    resumeStrength: 0,
    skillMatch: 0,
    communication: 0,
  };

  // Trend calculation
  const history = readiness?.history || [];
  const initialScore = history.length > 0 ? history[0].score : score;
  const trendDiff = score - initialScore;
  const trendText = trendDiff >= 0 ? `+${trendDiff}% improvement` : `${trendDiff}% change`;

  const activeCategoryKey = readiness?.candidateType || selectedCandidateType;

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Top Header Bar */}
      <div className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="text-xs font-semibold hover:bg-muted"
            >
              ← Dashboard
            </Button>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span>🎯</span>
              <span>Placement Readiness Report</span>
            </h1>
          </div>

          <Button
            size="sm"
            onClick={() => router.push("/interview")}
            className="text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
          >
            Start Mock Interview 🚀
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-8">
        {/* Candidate Strategy Type Selector Bar */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Candidate Category Strategy</p>
            <p className="text-xs text-muted-foreground">Tailors roadmaps, project recommendations & tech focus</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(["Fresher", "Internship Seeker", "Experienced Candidate"] as const).map((type) => (
              <button
                key={type}
                disabled={isUpdating}
                onClick={() => handleCandidateTypeChange(type)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedCandidateType === type
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* ── OVERALL READINESS SCORE BANNER ────────────────────── */}
        <Card className="p-6 sm:p-8 border border-border shadow-md bg-gradient-to-br from-card via-card to-muted/40 relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${badge.bg} ${badge.text} ${badge.border}`}>
                  <span>{badge.icon}</span>
                  <span>{classification}</span>
                </span>

                {history.length > 1 && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    📈 {trendText} ({history.length} evaluation sessions)
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Overall Placement Readiness Score
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                Combined evaluation from your resume analysis, technical interview performance, domain skill match, and communication depth.
              </p>
            </div>

            {/* Score Radial Badge */}
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card border border-border shadow-inner shrink-0 min-w-[160px]">
              <span className="text-4xl sm:text-5xl font-extrabold text-foreground">{score}%</span>
              <span className="text-xs font-semibold text-muted-foreground mt-1">Readiness Rating</span>
              <div className="w-full bg-muted rounded-full h-2 mt-3 overflow-hidden border border-border/50">
                <div
                  className="bg-gradient-to-r from-primary to-accent h-full rounded-full transition-all duration-700"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          </div>

          {/* 4 Key Components Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-border/50">
            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Interview Performance</span>
                <span className="text-xs font-bold text-primary">40% weight</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{comps.interviewPerformance}%</p>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="bg-primary h-full" style={{ width: `${comps.interviewPerformance}%` }} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Resume Strength</span>
                <span className="text-xs font-bold text-primary">25% weight</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{comps.resumeStrength}%</p>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="bg-accent h-full" style={{ width: `${comps.resumeStrength}%` }} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Skill Match</span>
                <span className="text-xs font-bold text-primary">20% weight</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{comps.skillMatch}%</p>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${comps.skillMatch}%` }} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Communication</span>
                <span className="text-xs font-bold text-primary">15% weight</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{comps.communication}%</p>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="bg-purple-500 h-full" style={{ width: `${comps.communication}%` }} />
              </div>
            </div>
          </div>
        </Card>

        {/* ── 2 COLUMN LAYOUT: STRENGTHS / WEAKNESSES / SKILLS / GAPS ────── */}
        <div key={`strengths-gaps-${activeCategoryKey}`} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Strong & Weak Areas */}
          <Card className="p-6 border border-border space-y-6">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>✅</span>
                <span>Demonstrated Strong Areas</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Topics where you scored high ($\ge 8/10$) in interviews or resume</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {readiness?.strongAreas && readiness.strongAreas.length > 0 ? (
                  readiness.strongAreas.map((area, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      ✓ {area}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">Complete interviews to showcase strong technical areas.</span>
                )}
              </div>
            </div>

            <div className="border-t border-border/50 pt-5">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>⚠️</span>
                <span>Weak Technical Areas</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Topics requiring practice based on test history</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {readiness?.weakAreas && readiness.weakAreas.length > 0 ? (
                  readiness.weakAreas.map((area, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      ! {area}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-emerald-600 font-medium">No severe weak technical areas detected!</span>
                )}
              </div>
            </div>
          </Card>

          {/* Column 2: Missing Skills & Communication Gaps */}
          <Card className="p-6 border border-border space-y-6">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>🛠️</span>
                <span>Missing Industry Skills</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Expected skills for target role ({readiness?.targetDomain || "General"}) missing from profile</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {readiness?.missingSkills && readiness.missingSkills.length > 0 ? (
                  readiness.missingSkills.map((skill, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                      + {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-emerald-600 font-medium">Matches all core expected skills for {readiness?.targetDomain}!</span>
                )}
              </div>
            </div>

            <div className="border-t border-border/50 pt-5">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>💬</span>
                <span>Communication & Structuring Gaps</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Actionable advice based on interview answer analysis</p>
              <div className="space-y-2 mt-3">
                {readiness?.communicationGaps && readiness.communicationGaps.length > 0 ? (
                  readiness.communicationGaps.map((gap, i) => (
                    <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/60 text-xs text-foreground flex items-start gap-2.5">
                      <span className="text-primary font-bold shrink-0">👉</span>
                      <span>{gap}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">Good communication structuring demonstrated.</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* ── PERSONALIZED ROADMAP ────────────────────────────────── */}
        <Card key={`roadmap-${activeCategoryKey}`} className="p-6 sm:p-8 border border-border shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🗺️</span>
              <h3 className="text-lg font-bold text-foreground">Personalized Improvement Roadmap</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Structured step-by-step action plan tailored for a <span className="font-bold text-foreground">{readiness?.candidateType}</span> in <span className="font-bold text-foreground">{readiness?.targetDomain}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(readiness?.roadmap || []).map((phase, idx) => (
              <div key={`${activeCategoryKey}-phase-${idx}`} className="p-5 rounded-2xl bg-muted/30 border border-border/80 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-primary uppercase tracking-wider">{phase.phase}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {phase.duration}
                    </span>
                  </div>
                  <div className="h-px bg-border/50" />
                  <ul className="space-y-2.5 pt-1">
                    {(phase.tasks || []).map((task, tIdx) => (
                      <li key={`${activeCategoryKey}-task-${tIdx}`} className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                        <span className="leading-relaxed">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── RECOMMENDED TECHNOLOGIES & PROJECTS ────────────────── */}
        <div key={`tech-projects-${activeCategoryKey}`} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tech & Certifications Column */}
          <div className="space-y-6 lg:col-span-1">
            <Card className="p-6 border border-border space-y-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>💻</span>
                <span>Technologies to Learn</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {(readiness?.recommendedTechnologies || []).map((tech, i) => (
                  <span key={`${activeCategoryKey}-tech-${i}`} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                    {tech}
                  </span>
                ))}
              </div>
            </Card>

            <Card className="p-6 border border-border space-y-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>📜</span>
                <span>Optional Certifications</span>
              </h3>
              <div className="space-y-3">
                {(readiness?.recommendedCertifications || []).map((cert, i) => (
                  <div key={`${activeCategoryKey}-cert-${i}`} className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-foreground">{cert.title}</p>
                      <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded bg-muted">Optional</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Provider: {cert.provider}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Recommended Projects Column */}
          <div className="lg:col-span-2">
            <Card className="p-6 sm:p-8 border border-border space-y-6 h-full">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>🚀</span>
                  <span>Recommended Portfolio Projects</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hands-on projects designed to bridge missing skills for a {readiness?.candidateType}
                </p>
              </div>

              <div className="space-y-4">
                {(readiness?.recommendedProjects || []).map((proj, i) => (
                  <div key={`${activeCategoryKey}-proj-${i}`} className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3 hover:border-primary/40 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{proj.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{proj.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">Skills:</span>
                      {(proj.skills || []).map((sk, sIdx) => (
                        <span key={sIdx} className="px-2 py-0.5 rounded bg-muted text-[10px] font-semibold text-foreground border border-border/60">
                          {sk}
                        </span>
                      ))}
                    </div>

                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-primary dark:text-primary-foreground font-medium">
                      💡 <span className="font-bold">Why:</span> {proj.why}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ── INTERVIEW TOPICS TO REVISE ──────────────────────────── */}
        <Card key={`topics-${activeCategoryKey}`} className="p-6 sm:p-8 border border-border space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>📚</span>
                <span>Prioritized Interview Topics to Revise</span>
              </h3>
              <p className="text-xs text-muted-foreground">Order based on test performance and domain expectations</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(readiness?.interviewTopics || []).map((item, i) => {
              const pStyle = priorityStyles[item.priority] || priorityStyles.Medium;
              return (
                <div key={`${activeCategoryKey}-topic-${i}`} className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-foreground">{item.topic}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}>
                    {item.priority}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── HISTORICAL PROGRESS TIMELINE ───────────────────────── */}
        {history.length > 0 && (
          <Card className="p-6 sm:p-8 border border-border space-y-6">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>📊</span>
                <span>Readiness Score History & Progress</span>
              </h3>
              <p className="text-xs text-muted-foreground">Track score improvements across mock interview evaluation sessions</p>
            </div>

            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={i} className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/20">
                      #{i + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-foreground">Session {i + 1}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(h.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">{h.classification}</span>
                    <span className="text-base font-extrabold text-foreground">{h.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
