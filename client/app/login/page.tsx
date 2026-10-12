"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import Link from "next/link";
import React, { useState } from "react";

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { login, isLoading } = useAuth();
  const [error, setError] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [resendNotice, setResendNotice] = useState("");
  const [devVerificationUrl, setDevVerificationUrl] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLocked(false);
    setResendNotice("");
    setDevVerificationUrl("");

    try {
      await login(formData.email, formData.password);
    } catch (err: any) {
      if (err.response?.status === 423) {
        setIsLocked(true);
      }
      const msg = err.response?.data?.message || "Invalid email or password. Please try again.";
      setError(msg);
    }
  };

  const handleResendVerification = async () => {
    if (!formData.email) {
      setError("Please enter your email address to resend verification.");
      return;
    }
    setResendNotice("");
    try {
      const { data } = await axiosInstance.post("/api/auth/resend-verification", {
        email: formData.email,
      });
      setResendNotice(data.message || "Verification email sent!");
      if (data.devVerificationUrl) {
        setDevVerificationUrl(data.devVerificationUrl);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to resend verification link.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">AI</span>
          </div>
        </div>

        <Card className="p-8 border border-border/50 shadow-lg bg-card">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 text-center">
              Welcome Back
            </h1>
            <p className="text-center text-muted-foreground text-sm">
              Sign in with enterprise security protection
            </p>
          </div>

          {error && (
            <div className={`mb-6 p-4 rounded-lg text-sm border font-medium ${isLocked ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
              {isLocked ? "🔒 Account Locked: " : "⚠️ "} {error}
            </div>
          )}

          {resendNotice && (
            <div className="mb-6 p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm border border-emerald-500/20 font-medium space-y-2">
              <p>✅ {resendNotice}</p>
              {devVerificationUrl && (
                <div className="pt-2 border-t border-emerald-500/20 text-xs">
                  <span className="font-semibold block mb-1">Development Verification Link:</span>
                  <a href={devVerificationUrl} className="text-primary underline break-all font-mono">
                    {devVerificationUrl}
                  </a>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold mb-2 text-foreground"
              >
                Email Address
              </label>
              <Input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="rounded-lg"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-foreground"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <Input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="rounded-lg"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || isLocked}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-full py-2.5 mt-6 shadow-md"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-border/50 flex flex-col items-center space-y-3 text-xs">
            <button
              type="button"
              onClick={handleResendVerification}
              className="text-muted-foreground hover:text-primary transition-colors underline"
            >
              Need email verification link? Resend here
            </button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                Don&apos;t have an account?{" "}
              </span>
              <Link
                href="/register"
                className="text-primary font-semibold hover:underline"
              >
                Create one
              </Link>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Protected by SHA-256 tokens & bcrypt encryption
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
