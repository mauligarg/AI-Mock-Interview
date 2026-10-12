"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/RoleGuard";
import axiosInstance from "@/lib/axios";

export default function StudentDetailMentorView() {
  const params = useParams();
  const studentId = (params.studentId || params.id) as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);

  // Feedback form state
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string>("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  const fetchDetail = async () => {
    try {
      const res = await axiosInstance.get(`/api/mentor/students/${studentId}`);
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load student performance details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchDetail();
    }
  }, [studentId]);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError("");
    setFeedbackSuccess("");

    if (!feedbackText.trim()) {
      setFeedbackError("Please enter feedback text.");
      return;
    }

    setSubmittingFeedback(true);
    try {
      const res = await axiosInstance.post(`/api/mentor/students/${studentId}/feedback`, {
        feedback: feedbackText,
        rating,
        interviewId: selectedInterviewId || undefined,
      });

      setFeedbackSuccess(res.data.message || "Feedback submitted successfully!");
      setFeedbackText("");
      setSelectedInterviewId("");
      fetchDetail();
    } catch (err: any) {
      setFeedbackError(err.response?.data?.message || "Failed to submit feedback.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <RoleGuard allowedRoles={["mentor", "admin"]}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading student profile & performance data...</p>
          </div>
        </div>
      </RoleGuard>
    );
  }

  if (error || !data) {
    return (
      <RoleGuard allowedRoles={["mentor", "admin"]}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 text-center space-y-4 border-destructive/30">
            <div className="text-3xl">⚠️</div>
            <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </Card>
        </div>
      </RoleGuard>
    );
  }

  const { student, interviews, readiness, challengeStats, feedbackHistory } = data;

  return (
    <RoleGuard allowedRoles={["mentor", "admin"]}>
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{student.name}</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                {student.isEmailVerified ? "Verified Email" : "Unverified"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-mono mt-1">{student.email}</p>
          </div>
          <div className="text-xs text-muted-foreground">
            Registered: {new Date(student.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 border-border/50 bg-card space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Interviews</div>
            <div className="text-2xl font-bold text-foreground">{interviews.length}</div>
          </Card>

          <Card className="p-4 border-border/50 bg-card space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Readiness Index</div>
            <div className="text-2xl font-bold text-emerald-500">
              {readiness ? `${readiness.readinessIndex ?? readiness.overallReadinessScore ?? readiness.currentScore ?? 0}%` : "N/A"}
            </div>
          </Card>

          <Card className="p-4 border-border/50 bg-card space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Challenge XP</div>
            <div className="text-2xl font-bold text-amber-500">
              {challengeStats?.totalXP ? `${challengeStats.totalXP} XP` : "0 XP"}
            </div>
          </Card>

          <Card className="p-4 border-border/50 bg-card space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Rank</div>
            <div className="text-2xl font-bold text-primary">
              {challengeStats?.currentRank || "Unranked"}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Interview History & Performance */}
          <div className="space-y-6">
            <Card className="p-6 border-border/50 bg-card space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                📊 Interview Performance History
              </h2>

              {interviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No interview sessions recorded yet.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {interviews.map((item: any) => (
                    <div key={item._id} className="p-4 rounded-lg border border-border/50 bg-secondary/20 space-y-2 text-xs">
                      <div className="flex justify-between items-center font-bold text-sm text-foreground">
                        <span>{item.domain} Interview</span>
                        <span className="text-primary font-mono">
                          {item.displayScore !== undefined ? item.displayScore : (item.overallScore || item.score || 0)}% Score
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span>Mode: {item.interviewMode || "Standard"}</span>
                        <span>Company: {item.company || "General"}</span>
                        <span>Questions Answered: {item.questionsAnswered || 0}</span>
                        <span>Date: {new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Previous Feedback History */}
            <Card className="p-6 border-border/50 bg-card space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                📝 Previous Mentor Reviews
              </h2>

              {feedbackHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No mentor feedback submitted yet.</p>
              ) : (
                <div className="space-y-3">
                  {feedbackHistory.map((fb: any) => (
                    <div key={fb._id} className="p-4 rounded-lg border border-border/50 bg-secondary/20 space-y-2 text-xs">
                      <div className="flex justify-between items-center font-semibold text-foreground">
                        <span>By {fb.mentorId?.name || "Mentor"}</span>
                        <span className="text-amber-500 font-bold">★ {fb.rating}/5</span>
                      </div>
                      <p className="text-foreground text-sm">{fb.feedback}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(fb.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Provide Structured Mentor Feedback */}
          <div>
            <Card className="p-6 border-border/50 bg-card space-y-4 sticky top-24">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                ✍️ Provide Mentor Review & Feedback
              </h2>

              {feedbackError && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-xs font-medium border border-destructive/20">
                  ⚠️ {feedbackError}
                </div>
              )}

              {feedbackSuccess && (
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-medium border border-emerald-500/20">
                  ✅ {feedbackSuccess}
                </div>
              )}

              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">
                    Related Interview (Optional)
                  </label>
                  <select
                    value={selectedInterviewId}
                    onChange={(e) => setSelectedInterviewId(e.target.value)}
                    className="w-full p-2 bg-secondary border border-border rounded-lg text-xs text-foreground"
                  >
                    <option value="">-- General Student Performance Feedback --</option>
                    {interviews.map((item: any) => (
                      <option key={item._id} value={item._id}>
                        {item.domain} ({item.company}) - Score: {item.overallScore || 0}%
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">
                    Performance Rating (1 to 5 Stars)
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full p-2 bg-secondary border border-border rounded-lg text-xs text-foreground"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5/5 - Exceptional)</option>
                    <option value={4}>⭐⭐⭐⭐ (4/5 - Strong)</option>
                    <option value={3}>⭐⭐⭐ (3/5 - Average / Satisfactory)</option>
                    <option value={2}>⭐⭐ (2/5 - Needs Improvement)</option>
                    <option value={1}>⭐ (1/5 - Unsatisfactory)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">
                    Structured Mentor Feedback & Actionable Recommendations
                  </label>
                  <textarea
                    rows={6}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Enter constructive advice on core fundamentals, coding style, communication clarity, strengths, and areas to improve..."
                    required
                    className="w-full p-3 bg-secondary border border-border rounded-lg text-xs text-foreground resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submittingFeedback}
                  className="w-full bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-full py-2.5 shadow-md text-xs"
                >
                  {submittingFeedback ? "Submitting Review..." : "Submit Mentor Feedback"}
                </Button>
              </form>
            </Card>
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
