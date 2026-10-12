"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/RoleGuard";
import axiosInstance from "@/lib/axios";

export default function MentorDashboard() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    const fetchAssigned = async () => {
      try {
        const { data } = await axiosInstance.get("/api/mentor/students");
        setStudents(data.students || []);
      } catch (err) {
        console.error("Error loading assigned students", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssigned();
  }, []);

  return (
    <RoleGuard allowedRoles={["mentor", "admin"]}>
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <span>👨‍🏫</span> Mentor Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review assigned student interview performances, track progress, and provide structured feedback.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card className="p-5 border-border/50 bg-card space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assigned Students
            </div>
            <div className="text-3xl font-bold text-foreground">{students.length}</div>
            <p className="text-xs text-muted-foreground">Active mentee profiles</p>
          </Card>

          <Card className="p-5 border-border/50 bg-card space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Review Status
            </div>
            <div className="text-3xl font-bold text-amber-500">Ready for Review</div>
            <p className="text-xs text-muted-foreground">Inspect interview performance histories</p>
          </Card>

          <Card className="p-5 border-border/50 bg-card space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Role Access
            </div>
            <div className="text-xl font-bold text-emerald-500">✅ Mentor Authorized</div>
            <p className="text-xs text-muted-foreground">Isolates data to assigned students only</p>
          </Card>
        </div>

        {/* Assigned Students List */}
        <Card className="p-6 border-border/50 bg-card space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              🎓 Assigned Mentees
            </h2>
            <Link href="/mentor/students">
              <Button variant="outline" size="sm" className="text-xs rounded-full">
                View All Assigned Students →
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
              Loading assigned students...
            </div>
          ) : students.length === 0 ? (
            <div className="py-8 text-center space-y-2 border border-dashed border-border/60 rounded-xl p-6">
              <p className="text-muted-foreground font-medium">No students currently assigned to you.</p>
              <p className="text-xs text-muted-foreground">
                Administrators can assign students to your mentor account from the User Management panel.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {students.map((item) => {
                const sId = item.student._id || item.student.id;
                return (
                  <Card
                    key={sId}
                    className="p-5 border-border/60 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-foreground text-lg">{item.student.name}</h3>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {item.student.isEmailVerified ? "Verified" : "Unverified"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate">{item.student.email}</p>
                      <p className="text-[11px] text-muted-foreground opacity-80">
                        Assigned: {new Date(item.assignedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <Link href={`/mentor/students/${sId}`}>
                      <Button size="sm" className="w-full bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-full text-xs">
                        Review Performance & Feedback →
                      </Button>
                    </Link>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </RoleGuard>
  );
}
