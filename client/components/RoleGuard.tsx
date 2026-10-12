"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Role } from "@/lib/permissions";
import AccessDeniedPage from "@/app/access-denied/page";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: Role | Role[];
  requiredPermission?: string;
}

export function RoleGuard({ children, allowedRoles, requiredPermission }: RoleGuardProps) {
  const { isLoggedIn, isLoading, hasRole, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoading, isLoggedIn, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Verifying security permissions...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return <AccessDeniedPage />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}
