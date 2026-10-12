"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleGuard } from "@/components/RoleGuard";
import axiosInstance from "@/lib/axios";

export default function AdminSystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [settings, setSettings] = useState({
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
    passwordExpiryDays: 90,
    dailyChallengeXP: 100,
    weeklyChallengeXP: 500,
    singleSessionPolicy: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await axiosInstance.get("/api/admin/settings");
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      } catch (err) {
        console.error("Error loading system settings", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");

    try {
      const { data } = await axiosInstance.patch("/api/admin/settings", {
        settings,
      });
      setNotice(data.message || "Settings updated successfully!");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <span>⚙️</span> System Settings & Configurations
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Dynamic platform parameters for account lockout, password expiration, challenge rewards, and security policies.
          </p>
        </div>

        {notice && (
          <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-lg text-sm border border-emerald-500/20 font-medium">
            ✅ {notice}
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm border border-destructive/20 font-medium">
            ⚠️ {error}
          </div>
        )}

        <Card className="p-8 border border-border/50 bg-card space-y-6">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
              Loading settings...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Security & Lockout Policy Section */}
              <div className="space-y-4 border-b border-border/50 pb-6">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  🔒 Account Security & Lockout Policy
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-foreground">
                      Max Failed Login Attempts Before Lockout
                    </label>
                    <Input
                      type="number"
                      min={3}
                      max={10}
                      value={settings.maxFailedAttempts}
                      onChange={(e) => setSettings({ ...settings, maxFailedAttempts: Number(e.target.value) })}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Default: 5 attempts</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-foreground">
                      Lockout Duration (Minutes)
                    </label>
                    <Input
                      type="number"
                      min={5}
                      max={60}
                      value={settings.lockoutDurationMinutes}
                      onChange={(e) => setSettings({ ...settings, lockoutDurationMinutes: Number(e.target.value) })}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Default: 15 minutes</p>
                  </div>
                </div>
              </div>

              {/* Challenge XP & Reward Rules Section */}
              <div className="space-y-4 border-b border-border/50 pb-6">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  🏆 Challenge Arena XP Rules
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-foreground">
                      Daily Challenge Completion Base XP
                    </label>
                    <Input
                      type="number"
                      min={10}
                      max={500}
                      value={settings.dailyChallengeXP}
                      onChange={(e) => setSettings({ ...settings, dailyChallengeXP: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-foreground">
                      Weekly Challenge Completion Base XP
                    </label>
                    <Input
                      type="number"
                      min={50}
                      max={2000}
                      value={settings.weeklyChallengeXP}
                      onChange={(e) => setSettings({ ...settings, weeklyChallengeXP: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Session Policy Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  💻 Session Enforcement Policy
                </h3>

                <div className="flex items-center space-x-3 bg-secondary/30 p-4 rounded-lg border border-border/50">
                  <input
                    type="checkbox"
                    id="singleSession"
                    checked={settings.singleSessionPolicy}
                    onChange={(e) => setSettings({ ...settings, singleSessionPolicy: e.target.checked })}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <label htmlFor="singleSession" className="text-xs text-foreground font-medium cursor-pointer">
                    Enforce Single Active Session Per User (Automatically revokes old device sessions on new login)
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-full py-2.5 shadow-md"
                >
                  {saving ? "Saving Configurations..." : "Save System Settings"}
                </Button>
              </div>

            </form>
          )}
        </Card>
      </div>
    </RoleGuard>
  );
}
