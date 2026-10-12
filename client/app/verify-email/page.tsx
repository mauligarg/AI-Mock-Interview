"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axios";
import Link from "next/link";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token || !email) {
      setLoading(false);
      setMessage("Missing verification token or email address.");
      return;
    }

    const doVerify = async () => {
      try {
        const { data } = await axiosInstance.post("/api/auth/verify-email", {
          token,
          email,
        });
        setSuccess(true);
        setMessage(data.message || "Email verified successfully!");
      } catch (err: any) {
        setSuccess(false);
        setMessage(err.response?.data?.message || "Verification failed or token expired.");
      } finally {
        setLoading(false);
      }
    };

    doVerify();
  }, [token, email]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary px-4 py-8">
      <Card className="w-full max-w-md p-8 border border-border/50 shadow-lg text-center space-y-6 bg-card">
        <div className="flex justify-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold ${loading ? "bg-primary/10 text-primary animate-pulse" : success ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
            {loading ? "⏳" : success ? "✅" : "⚠️"}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {loading ? "Verifying Your Email..." : success ? "Email Verified!" : "Verification Failed"}
          </h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {!loading && (
          <div className="pt-4 border-t border-border/50">
            <Link href={success ? "/login" : "/register"}>
              <Button className="w-full bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-full py-2">
                {success ? "Proceed to Login" : "Back to Registration"}
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
