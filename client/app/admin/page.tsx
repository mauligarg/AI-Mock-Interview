"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/RoleGuard";
import axiosInstance from "@/lib/axios";

export default function AdminDashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchOverview = async () => {
    try {
      const res = await axiosInstance.get("/api/admin/overview");
      setData(res.data);
    } catch (err) {
      console.error("Error loading admin overview", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();

    // Re-fetch metrics whenever tab regains focus so counts update immediately
    const onFocus = () => fetchOverview();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const metrics = data?.metrics || {};
  const recentAlerts = data?.recentAlerts || [];

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <span>🛡️</span> Administrator Command Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Platform governance, user management, role assignments, system analytics, and security controls.
          </p>
        </div>

        {/* System Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="p-5 border-border/50 bg-card space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Users
            </div>
            <div className="text-3xl font-bold text-foreground">
              {loading ? "..." : metrics.totalUsers}
            </div>
            <div className="text-xs text-muted-foreground flex justify-between pt-1">
              <span>Students: {metrics.studentCount || 0}</span>
              <span>Mentors: {metrics.mentorCount || 0}</span>
              <span>Admins: {metrics.adminCount || 0}</span>
            </div>
          </Card>

          <Card className="p-5 border-border/50 bg-card space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Sessions
            </div>
            <div className="text-3xl font-bold text-emerald-500">
              {loading ? "..." : metrics.activeSessionsCount}
            </div>
            <p className="text-xs text-muted-foreground">Currently logged-in devices</p>
          </Card>

          <Card className="p-5 border-border/50 bg-card space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Interviews Completed
            </div>
            <div className="text-3xl font-bold text-primary">
              {loading ? "..." : metrics.interviewCount}
            </div>
            <p className="text-xs text-muted-foreground">Adaptive engine interviews</p>
          </Card>

          <Card className="p-5 border-border/50 bg-card space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Challenge Attempts
            </div>
            <div className="text-3xl font-bold text-amber-500">
              {loading ? "..." : metrics.challengeCount}
            </div>
            <p className="text-xs text-muted-foreground">Peer arena challenges completed</p>
          </Card>
        </div>

        {/* Quick Admin Actions & Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-border/50 bg-card space-y-4 hover:border-primary/40 transition-all">
            <div className="text-2xl">👥</div>
            <h2 className="text-xl font-bold text-foreground">User & Role Management</h2>
            <p className="text-xs text-muted-foreground">
              View all users, change user roles (Student / Mentor / Admin), assign mentors to students, inspect email verification status.
            </p>
            <Link href="/admin/users">
              <Button className="w-full bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-full text-xs">
                Manage Users & Roles →
              </Button>
            </Link>
          </Card>

          <Card className="p-6 border-border/50 bg-card space-y-4 hover:border-primary/40 transition-all">
            <div className="text-2xl">📜</div>
            <h2 className="text-xl font-bold text-foreground">Platform Activity & Audit</h2>
            <p className="text-xs text-muted-foreground">
              Inspect real-time authentication events, logins, security alerts, completed interviews, and challenge submissions.
            </p>
            <Link href="/admin/activity">
              <Button className="w-full bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-full text-xs">
                View Activity Logs →
              </Button>
            </Link>
          </Card>

          <Card className="p-6 border-border/50 bg-card space-y-4 hover:border-primary/40 transition-all">
            <div className="text-2xl">⚙️</div>
            <h2 className="text-xl font-bold text-foreground">System Settings</h2>
            <p className="text-xs text-muted-foreground">
              Configure platform parameters: readiness thresholds, XP rewards, lockout duration, and session policies.
            </p>
            <Link href="/admin/settings">
              <Button className="w-full bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-full text-xs">
                Configure Settings →
              </Button>
            </Link>
          </Card>
        </div>

        {/* Platform Security Alerts Panel */}
        <Card className="p-6 border-border/50 bg-card space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            🚨 Recent Platform Security Events
          </h2>

          {loading ? (
            <div className="py-4 text-center text-sm text-muted-foreground animate-pulse">
              Loading security events...
            </div>
          ) : recentAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent security alerts recorded.</p>
          ) : (
            <div className="space-y-3">
              {recentAlerts.map((alert: any) => (
                <div
                  key={alert._id}
                  className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
                    alert.severity === "critical"
                      ? "bg-destructive/10 border-destructive/30 text-destructive"
                      : alert.severity === "warning"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                      : "bg-secondary/40 border-border/40 text-foreground"
                  }`}
                >
                  <div>
                    <p className="font-bold">{alert.message}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">
                      Event Type: {alert.type} • {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded border">
                    {alert.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </RoleGuard>
  );
}
