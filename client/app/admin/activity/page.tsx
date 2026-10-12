"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { RoleGuard } from "@/components/RoleGuard";
import axiosInstance from "@/lib/axios";

export default function AdminPlatformActivity() {
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<any>(null);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const { data } = await axiosInstance.get("/api/admin/activity");
        setActivity(data);
      } catch (err) {
        console.error("Error fetching activity", err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  const logins = activity?.recentLogins || [];
  const interviews = activity?.recentInterviews || [];
  const challenges = activity?.recentChallenges || [];
  const alerts = activity?.securityAlerts || [];

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <span>📜</span> Platform Activity & Audit Monitor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time audit log of user logins, interview completions, peer challenge attempts, and security events.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Recent Logins & Auth Events */}
          <Card className="p-6 border-border/50 bg-card space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              🔑 Recent Logins & Auth Events
            </h2>

            {loading ? (
              <div className="py-4 text-center text-sm text-muted-foreground animate-pulse">
                Loading login history...
              </div>
            ) : logins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent logins logged.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="py-2 px-1">User</th>
                      <th className="py-2 px-1">Device / IP</th>
                      <th className="py-2 px-1">Status</th>
                      <th className="py-2 px-1 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {logins.map((item: any) => (
                      <tr key={item._id} className="hover:bg-secondary/20">
                        <td className="py-2 px-1 font-medium text-foreground">
                          {item.userId?.name || "System"}
                        </td>
                        <td className="py-2 px-1 text-muted-foreground">
                          {item.browser} ({item.ip})
                        </td>
                        <td className="py-2 px-1 font-semibold">
                          {item.success ? (
                            <span className="text-emerald-500">Success</span>
                          ) : (
                            <span className="text-destructive">Failed</span>
                          )}
                        </td>
                        <td className="py-2 px-1 text-right text-muted-foreground">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Security Alerts Stream */}
          <Card className="p-6 border-border/50 bg-card space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              🚨 Security Events Stream
            </h2>

            {loading ? (
              <div className="py-4 text-center text-sm text-muted-foreground animate-pulse">
                Loading security events...
              </div>
            ) : alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No security alerts recorded.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {alerts.map((item: any) => (
                  <div
                    key={item._id}
                    className={`p-3 rounded-lg border text-xs flex justify-between items-start ${
                      item.severity === "critical"
                        ? "bg-destructive/10 border-destructive/30 text-destructive"
                        : item.severity === "warning"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                        : "bg-secondary/40 border-border/40 text-foreground"
                    }`}
                  >
                    <div>
                      <p className="font-bold">{item.message}</p>
                      <p className="text-[10px] opacity-70 mt-0.5">
                        User: {item.userId?.email || "Unknown"} • {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded border">
                      {item.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Completed Interviews Stream */}
          <Card className="p-6 border-border/50 bg-card space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              🎯 Interview Sessions Completed
            </h2>

            {loading ? (
              <div className="py-4 text-center text-sm text-muted-foreground animate-pulse">
                Loading interview activity...
              </div>
            ) : interviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No interviews completed recently.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {interviews.map((item: any) => (
                  <div key={item._id} className="p-3 rounded border border-border/40 bg-secondary/20 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-foreground">{item.userId?.name || "Student"} - {item.domain}</p>
                      <p className="text-muted-foreground text-[11px]">{item.company} Style • {item.questionsAnswered} Questions</p>
                    </div>
                    <span className="font-mono font-bold text-primary">{item.overallScore || 0}% Score</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Peer Challenge Submissions Stream */}
          <Card className="p-6 border-border/50 bg-card space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              🏆 Peer Challenge Submissions
            </h2>

            {loading ? (
              <div className="py-4 text-center text-sm text-muted-foreground animate-pulse">
                Loading challenge activity...
              </div>
            ) : challenges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No challenge attempts submitted recently.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {challenges.map((item: any) => (
                  <div key={item._id} className="p-3 rounded border border-border/40 bg-secondary/20 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-foreground">{item.userId?.name || "Candidate"}</p>
                      <p className="text-muted-foreground text-[11px]">XP Earned: +{item.xpEarned || 0} XP</p>
                    </div>
                    <span className="font-mono font-bold text-amber-500">{item.score || 0}% Score</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
      </div>
    </RoleGuard>
  );
}
