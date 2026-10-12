"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleGuard } from "@/components/RoleGuard";
import axiosInstance from "@/lib/axios";

export default function AssignedStudentsPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data } = await axiosInstance.get("/api/mentor/students");
        setStudents(data.students || []);
      } catch (err) {
        console.error("Error fetching assigned students", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const filtered = students.filter(
    (item) =>
      item.student.name.toLowerCase().includes(search.toLowerCase()) ||
      item.student.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <RoleGuard allowedRoles={["mentor", "admin"]}>
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <span>🎓</span> Assigned Students
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Access interview histories, readiness assessments, and provide mentor feedback for your assigned mentees.
          </p>
        </div>

        <Card className="p-6 border-border/50 bg-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Input
              type="text"
              placeholder="Search assigned student by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md rounded-lg"
            />
            <span className="text-xs text-muted-foreground">
              Showing {filtered.length} of {students.length} mentees
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
              Loading assigned students...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No assigned students found matching &quot;{search}&quot;.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((item) => {
                const sId = item.student._id || item.student.id;
                return (
                  <Card
                    key={sId}
                    className="p-5 border-border/60 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-foreground text-lg">{item.student.name}</h3>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 text-primary border border-primary/20">
                          Student
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate">{item.student.email}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Assigned Date: {new Date(item.assignedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <Link href={`/mentor/students/${sId}`}>
                      <Button size="sm" className="w-full bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-full text-xs">
                        View Full Performance & Feedback →
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
