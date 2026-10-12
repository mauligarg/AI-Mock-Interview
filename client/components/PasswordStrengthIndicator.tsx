"use client";

import React from "react";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const checks = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "At least 1 uppercase letter (A-Z)", valid: /[A-Z]/.test(password) },
    { label: "At least 1 lowercase letter (a-z)", valid: /[a-z]/.test(password) },
    { label: "At least 1 number (0-9)", valid: /[0-9]/.test(password) },
    { label: "At least 1 special character (!@#$%^&*)", valid: /[^A-Za-z0-9]/.test(password) },
  ];

  const passedCount = checks.filter((c) => c.valid).length;

  let strengthLabel = "Weak";
  let barColor = "bg-destructive";
  let percent = 20;

  if (passedCount <= 2) {
    strengthLabel = "Weak";
    barColor = "bg-destructive";
    percent = (passedCount / 5) * 100;
  } else if (passedCount === 3 || passedCount === 4) {
    strengthLabel = "Moderate";
    barColor = "bg-amber-500";
    percent = (passedCount / 5) * 100;
  } else if (passedCount === 5) {
    strengthLabel = "Strong (Enterprise Grade)";
    barColor = "bg-emerald-500";
    percent = 100;
  }

  return (
    <div className="mt-3 space-y-2 p-3 bg-secondary/30 rounded-lg border border-border/50 text-xs">
      <div className="flex justify-between items-center mb-1 font-semibold text-foreground">
        <span>Password Strength:</span>
        <span className={passedCount === 5 ? "text-emerald-500" : passedCount >= 3 ? "text-amber-500" : "text-destructive"}>
          {strengthLabel}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${percent}%` }} />
      </div>

      {/* Requirements Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2">
        {checks.map((check, idx) => (
          <div key={idx} className="flex items-center space-x-1.5">
            <span className={check.valid ? "text-emerald-500 font-bold" : "text-muted-foreground/60"}>
              {check.valid ? "✓" : "○"}
            </span>
            <span className={check.valid ? "text-foreground" : "text-muted-foreground"}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
