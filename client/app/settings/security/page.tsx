"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import axiosInstance from "@/lib/axios";

export default function SecuritySettingsPage() {
  const { user, isLoggedIn } = useAuth();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Password Change State
  const [passData, setPassData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passLoading, setPassLoading] = useState(false);
  const [passSuccess, setPassSuccess] = useState("");
  const [passError, setPassError] = useState("");

  // Verification Resend State
  const [resendNotice, setResendNotice] = useState("");
  const [devVerificationUrl, setDevVerificationUrl] = useState("");

  const fetchData = async () => {
    try {
      const [overviewRes, sessionsRes, historyRes, alertsRes] = await Promise.all([
        axiosInstance.get("/api/auth/security-overview"),
        axiosInstance.get("/api/auth/sessions"),
        axiosInstance.get("/api/auth/login-history"),
        axiosInstance.get("/api/auth/alerts"),
      ]);

      setOverview(overviewRes.data);
      setSessions(sessionsRes.data.sessions || []);
      setLoginHistory(historyRes.data.history || []);
      setAlerts(alertsRes.data.alerts || []);
    } catch (err) {
      console.error("Failed to load security data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");

    if (passData.newPassword !== passData.confirmPassword) {
      setPassError("New passwords do not match.");
      return;
    }

    setPassLoading(true);
    try {
      const { data } = await axiosInstance.post("/api/auth/change-password", {
        currentPassword: passData.currentPassword,
        newPassword: passData.newPassword,
      });
      setPassSuccess(data.message || "Password updated successfully!");
      setPassData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      fetchData();
    } catch (err: any) {
      setPassError(err.response?.data?.message || "Failed to update password.");
    } finally {
      setPassLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await axiosInstance.delete(`/api/auth/sessions/${sessionId}`);
      fetchData();
    } catch (err) {
      console.error("Error revoking session", err);
    }
  };

  const handleRevokeAllOther = async () => {
    try {
      await axiosInstance.delete("/api/auth/sessions");
      fetchData();
    } catch (err) {
      console.error("Error revoking other sessions", err);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResendNotice("");
    try {
      const { data } = await axiosInstance.post("/api/auth/resend-verification", {
        email: user.email,
      });
      setResendNotice(data.message || "Verification link sent!");
      if (data.devVerificationUrl) {
        setDevVerificationUrl(data.devVerificationUrl);
      }
    } catch (err: any) {
      setPassError(err.response?.data?.message || "Failed to send verification link.");
    }
  };

  const handleMarkAlertRead = async (alertId: string) => {
    try {
      await axiosInstance.put(`/api/auth/alerts/${alertId}/read`);
      setAlerts((prev) => prev.map((a) => (a._id === alertId ? { ...a, read: true } : a)));
    } catch (err) {
      console.error("Error marking alert read", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading Account Security Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <span>🛡️</span> Account & Security Center
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your credentials, active sessions, login history, and enterprise security policies.
        </p>
      </div>

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Verification */}
        <Card className="p-5 border-border/50 bg-card space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Email Verification Status
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold ${overview?.isEmailVerified ? "text-emerald-500" : "text-amber-500"}`}>
              {overview?.isEmailVerified ? "✅ Verified" : "⚠️ Unverified"}
            </span>
          </div>
          {!overview?.isEmailVerified && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendVerification}
                className="text-xs w-full border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              >
                Resend Verification Link
              </Button>
              {resendNotice && <p className="text-xs text-emerald-500 mt-2 font-medium">{resendNotice}</p>}
              {devVerificationUrl && (
                <div className="mt-2 text-xs font-mono bg-secondary p-2 rounded break-all">
                  Dev Link: <a href={devVerificationUrl} className="text-primary underline">{devVerificationUrl}</a>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Card 2: Active Sessions */}
        <Card className="p-5 border-border/50 bg-card space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Active Sessions
          </div>
          <div className="text-3xl font-bold text-foreground">
            {overview?.activeSessionsCount || sessions.length} <span className="text-sm font-normal text-muted-foreground">device(s)</span>
          </div>
          <p className="text-xs text-muted-foreground">Enforcing single active session policy</p>
        </Card>

        {/* Card 3: Last Password Change */}
        <Card className="p-5 border-border/50 bg-card space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Password Policy Status
          </div>
          <div className="text-sm font-semibold text-foreground">
            Last Changed: {overview?.passwordChangedAt ? new Date(overview.passwordChangedAt).toLocaleDateString() : "Never"}
          </div>
          <p className="text-xs text-emerald-500 font-medium">✅ Enterprise Bcrypt + History Check Active</p>
        </Card>
      </div>

      {/* Main Grid: Left Column (Password & Sessions), Right Column (Alerts & History) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column */}
        <div className="space-y-8">
          
          {/* Section 1: Change Password */}
          <Card className="p-6 border-border/50 bg-card space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              🔑 Change Password
            </h2>

            {passError && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-xs border border-destructive/20 font-medium">
                ⚠️ {passError}
              </div>
            )}

            {passSuccess && (
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs border border-emerald-500/20 font-medium">
                ✅ {passSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={passData.currentPassword}
                  onChange={(e) => setPassData({ ...passData, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  New Password
                </label>
                <Input
                  type="password"
                  value={passData.newPassword}
                  onChange={(e) => setPassData({ ...passData, newPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
                <PasswordStrengthIndicator password={passData.newPassword} />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={passData.confirmPassword}
                  onChange={(e) => setPassData({ ...passData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={passLoading}
                className="w-full bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-full"
              >
                {passLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </Card>

          {/* Section 2: Active Sessions Management */}
          <Card className="p-6 border-border/50 bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                💻 Active Sessions
              </h2>
              {sessions.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevokeAllOther}
                  className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  Sign Out Other Devices
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {sessions.map((s) => (
                <div
                  key={s.sessionId}
                  className={`p-4 rounded-lg border text-sm flex items-center justify-between ${
                    s.isCurrent ? "bg-primary/5 border-primary/30" : "bg-secondary/20 border-border/40"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <span>{s.browser}</span>
                      <span className="text-xs text-muted-foreground">({s.device})</span>
                      {s.isCurrent && (
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full uppercase">
                          Current Device
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-4">
                      <span>IP: {s.ip}</span>
                      <span>Last Active: {new Date(s.lastActiveAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {!s.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeSession(s.sessionId)}
                      className="text-xs text-destructive hover:bg-destructive/10"
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

        </div>

        {/* Right Column */}
        <div className="space-y-8">
          
          {/* Section 3: Security Alerts */}
          <Card className="p-6 border-border/50 bg-card space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              🚨 Security Notifications & Alerts
            </h2>

            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent security alerts.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {alerts.map((alert) => (
                  <div
                    key={alert._id}
                    className={`p-3 rounded-lg border text-xs flex items-start justify-between space-x-3 ${
                      alert.severity === "critical"
                        ? "bg-destructive/10 border-destructive/30 text-destructive"
                        : alert.severity === "warning"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                        : "bg-secondary/40 border-border/40 text-foreground"
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="font-semibold">{alert.message}</p>
                      <p className="text-[10px] opacity-70">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {!alert.read && (
                      <button
                        onClick={() => handleMarkAlertRead(alert._id)}
                        className="text-[10px] font-bold underline opacity-80 hover:opacity-100"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Section 4: Login Activity History */}
          <Card className="p-6 border-border/50 bg-card space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              📜 Login Activity History
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="py-2 px-1">Browser / Device</th>
                    <th className="py-2 px-1">IP</th>
                    <th className="py-2 px-1">Status</th>
                    <th className="py-2 px-1 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {loginHistory.map((item) => (
                    <tr key={item._id} className="hover:bg-secondary/20">
                      <td className="py-2.5 px-1 font-medium text-foreground">
                        {item.browser} <span className="text-muted-foreground font-normal">({item.device})</span>
                      </td>
                      <td className="py-2.5 px-1 text-muted-foreground font-mono">{item.ip}</td>
                      <td className="py-2.5 px-1 font-semibold">
                        {item.success ? (
                          <span className="text-emerald-500">Successful</span>
                        ) : (
                          <span className="text-destructive">Failed</span>
                        )}
                      </td>
                      <td className="py-2.5 px-1 text-right text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        </div>

      </div>
    </div>
  );
}
