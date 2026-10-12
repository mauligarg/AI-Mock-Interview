"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import { setSessionId, setStoredUser, setToken } from "@/lib/auth";

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [verifying, setVerifying] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const [mentorData, setMentorData] = useState<any>(null);
  const [verifyMessage, setVerifyMessage] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setVerifying(false);
      setVerifyMessage("Missing invitation token or email address in link.");
      return;
    }

    const checkInvite = async () => {
      try {
        const { data } = await axiosInstance.post("/api/auth/verify-invite-token", {
          token,
          email,
        });
        if (data.valid) {
          setInviteValid(true);
          setMentorData(data);
        } else {
          setVerifyMessage("Invitation link is invalid or expired.");
        }
      } catch (err: any) {
        setInviteValid(false);
        setVerifyMessage(
          err.response?.data?.message || "Invitation link is invalid or has expired."
        );
      } finally {
        setVerifying(false);
      }
    };

    checkInvite();
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await axiosInstance.post("/api/auth/accept-invite", {
        token,
        email,
        password,
      });

      if (data.token && data.user) {
        setToken(data.token);
        setStoredUser(data.user);
        if (data.sessionId) setSessionId(data.sessionId);
        setSuccess(true);

        setTimeout(() => {
          window.location.href = "/mentor";
        }, 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to complete mentor onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary px-4 py-8">
      <div className="w-full max-w-md">
        <Card className="p-8 border border-border/50 shadow-lg bg-card">
          
          <div className="mb-8 text-center space-y-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center mx-auto shadow-md">
              <span className="text-white font-bold text-xl">👨‍🏫</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Mentor Onboarding</h1>
            <p className="text-sm text-muted-foreground">
              Complete your account setup and choose your secure password
            </p>
          </div>

          {verifying ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Verifying invitation link...</p>
            </div>
          ) : !inviteValid ? (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm border border-destructive/20 font-medium">
                ⚠️ {verifyMessage}
              </div>
              <p className="text-xs text-muted-foreground">
                Please contact your platform Administrator to request a new mentor invitation.
              </p>
            </div>
          ) : success ? (
            <div className="text-center space-y-4 py-4">
              <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-lg text-sm border border-emerald-500/20 font-medium">
                ✅ Mentor onboarding completed successfully! Logging you in...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm border border-destructive/20 font-medium">
                  ⚠️ {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Name</label>
                <Input type="text" value={mentorData?.name || ""} disabled className="bg-muted text-muted-foreground rounded-lg" />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Email Address</label>
                <Input type="email" value={mentorData?.email || ""} disabled className="bg-muted text-muted-foreground rounded-lg font-mono" />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Set Account Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="rounded-lg"
                />
                <PasswordStrengthIndicator password={password} />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Confirm Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="rounded-lg"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-full py-2.5 mt-4 shadow-md"
              >
                {submitting ? "Setting Password & Activating..." : "Complete Onboarding & Access Portal →"}
              </Button>
            </form>
          )}

        </Card>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
