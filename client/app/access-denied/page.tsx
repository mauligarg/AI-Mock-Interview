"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function AccessDeniedPage() {
  const { user } = useAuth();
  const role = user?.role || "student";

  let destination = "/dashboard";
  if (role === "mentor") destination = "/mentor";
  if (role === "admin") destination = "/admin";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary px-4 py-8">
      <Card className="max-w-md w-full p-8 border border-border/50 shadow-xl text-center space-y-6 bg-card">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-3xl font-bold border border-destructive/20">
            🚫
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            You do not have permission to access this resource or execute this operation.
          </p>
          {user && (
            <p className="text-xs font-mono bg-secondary/50 p-2 rounded text-muted-foreground mt-2">
              Logged in as: <span className="font-bold text-foreground">{user.name}</span> (Role: <span className="uppercase text-primary font-bold">{role}</span>)
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-border/50">
          <Link href={destination}>
            <Button className="w-full bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-full py-2.5 shadow-md">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
