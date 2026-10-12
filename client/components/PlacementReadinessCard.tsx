"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface ReadinessData {
  currentScore: number;
  classification: "Needs Improvement" | "High Potential Candidate" | "Placement Ready";
  candidateType: "Fresher" | "Internship Seeker" | "Experienced Candidate";
  targetDomain: string;
  components: {
    interviewPerformance: number;
    resumeStrength: number;
    skillMatch: number;
    communication: number;
  };
  strongAreas: string[];
  weakAreas: string[];
  missingSkills: string[];
  communicationGaps: string[];
  history: Array<{
    score: number;
    classification: string;
    generatedAt: string;
  }>;
}

interface PlacementReadinessCardProps {
  readiness: ReadinessData | null;
  hasInterviews: boolean;
  hasResume: boolean;
  isLoading?: boolean;
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

export default function PlacementReadinessCard({
  readiness,
  hasInterviews,
  hasResume,
  isLoading,
}: PlacementReadinessCardProps) {
  const router = useRouter();

  // Insufficient Data State
  if (!hasInterviews && !hasResume) {
    return (
      <Card className="p-6 border border-border shadow-sm bg-card space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl">
            🎯
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Placement Readiness Engine</h3>
            <p className="text-xs text-muted-foreground">Comprehensive Career Readiness Analytics</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-muted/50 border border-border text-center space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Complete a resume analysis and at least one interview to generate your Placement Readiness Score.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="text-xs font-semibold"
            >
              Upload Resume
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/interview")}
              className="text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90"
            >
              Start Interview
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const score = readiness?.currentScore || 0;
  const classification = readiness?.classification || "Needs Improvement";
  const badge = statusBadgeStyles[classification] || statusBadgeStyles["Needs Improvement"];
  const comps = readiness?.components || {
    interviewPerformance: 0,
    resumeStrength: 0,
    skillMatch: 0,
    communication: 0,
  };

  return (
    <Card className="p-6 border border-border shadow-sm bg-card space-y-5 relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">🚀</span>
            <h3 className="text-base font-bold text-foreground">Placement Readiness</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Role: <span className="font-semibold text-foreground">{readiness?.targetDomain || "General"}</span> ({readiness?.candidateType || "Fresher"})
          </p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${badge.bg} ${badge.text} ${badge.border}`}
        >
          <span>{badge.icon}</span>
          <span>{classification}</span>
        </span>
      </div>

      {/* Primary Score Counter */}
      <div className="flex items-baseline justify-between p-4 rounded-xl bg-muted/40 border border-border">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Placement Readiness Score</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-extrabold text-foreground">{score}%</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* Progress Circle or Bar */}
        <div className="w-24 bg-muted rounded-full h-2.5 overflow-hidden border border-border/50">
          <div
            className="bg-gradient-to-r from-primary to-accent h-full rounded-full transition-all duration-500"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Breakdown Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
          <p className="text-muted-foreground font-medium">Technical Readiness</p>
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground text-sm">{comps.interviewPerformance}%</span>
            <span className="text-[10px] text-muted-foreground">Weight: 40%</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
          <p className="text-muted-foreground font-medium">Communication</p>
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground text-sm">{comps.communication}%</span>
            <span className="text-[10px] text-muted-foreground">Weight: 15%</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
          <p className="text-muted-foreground font-medium">Resume Strength</p>
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground text-sm">{comps.resumeStrength}%</span>
            <span className="text-[10px] text-muted-foreground">Weight: 25%</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
          <p className="text-muted-foreground font-medium">Industry Skill Match</p>
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground text-sm">{comps.skillMatch}%</span>
            <span className="text-[10px] text-muted-foreground">Weight: 20%</span>
          </div>
        </div>
      </div>

      {/* View Full Report Action */}
      <Button
        onClick={() => router.push("/dashboard/readiness")}
        className="w-full py-2.5 font-bold text-xs bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-95 transition-opacity shadow-sm"
      >
        View Placement Readiness Report →
      </Button>
    </Card>
  );
}
