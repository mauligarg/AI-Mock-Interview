"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleGuard } from "@/components/RoleGuard";
import axiosInstance from "@/lib/axios";

export default function AdminUserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [devInviteUrl, setDevInviteUrl] = useState("");

  // Mentor Assignment Form Modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // Invite Mentor Modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "",
  });
  const [inviteLoading, setInviteLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;

      const { data } = await axiosInstance.get("/api/admin/users", { params });
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setError("");
    setNotice("");
    setDevInviteUrl("");
    try {
      const { data } = await axiosInstance.patch(`/api/admin/users/${userId}/role`, {
        role: newRole,
      });
      setNotice(data.message || `Updated role to ${newRole}`);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update user role");
    }
  };

  const handleInviteMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setError("");
    setNotice("");
    setDevInviteUrl("");

    try {
      const { data } = await axiosInstance.post("/api/admin/mentors/invite", inviteForm);
      setNotice(data.message || "Mentor invitation created successfully.");
      if (data.devInviteUrl) {
        setDevInviteUrl(data.devInviteUrl);
      }
      setShowInviteModal(false);
      setInviteForm({ name: "", email: "", phone: "", specialization: "" });
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create mentor invitation.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvite = async (userId: string) => {
    setError("");
    setNotice("");
    setDevInviteUrl("");
    try {
      const { data } = await axiosInstance.post(`/api/admin/mentors/${userId}/resend-invite`);
      setNotice(data.message || "Invitation resent.");
      if (data.devInviteUrl) {
        setDevInviteUrl(data.devInviteUrl);
      }
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to resend invitation.");
    }
  };

  const handleRevokeInvite = async (userId: string) => {
    if (!confirm("Are you sure you want to revoke this pending mentor invitation?")) return;
    setError("");
    setNotice("");
    try {
      const { data } = await axiosInstance.delete(`/api/admin/mentors/${userId}/revoke-invite`);
      setNotice(data.message || "Invitation revoked.");
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to revoke invitation.");
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "disabled" ? "active" : "disabled";
    setError("");
    setNotice("");
    try {
      const { data } = await axiosInstance.patch(`/api/admin/users/${userId}/status`, {
        status: nextStatus,
      });
      setNotice(data.message || `Account status updated to ${nextStatus}.`);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, accountStatus: nextStatus, computedStatus: nextStatus } : u))
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update account status.");
    }
  };

  const handleAssignMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedMentorId) return;

    setAssignLoading(true);
    setError("");
    setNotice("");

    try {
      const { data } = await axiosInstance.post("/api/admin/assignments", {
        studentId: selectedStudent._id,
        mentorId: selectedMentorId,
      });
      setNotice(data.message || "Assigned mentor successfully!");
      setShowAssignModal(false);
      setSelectedStudent(null);
      setSelectedMentorId("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to assign mentor");
    } finally {
      setAssignLoading(false);
    }
  };

  const mentorsList = users.filter((u) => u.role === "mentor" && u.accountStatus !== "disabled");

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        
        {/* Header with Invite Mentor Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <span>👥</span> User & Role Management
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage user roles, invite mentors securely, disable/enable accounts, and assign mentors.
            </p>
          </div>

          <Button
            onClick={() => setShowInviteModal(true)}
            className="bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-full px-6 py-2.5 shadow-md flex items-center gap-2 self-start sm:self-auto"
          >
            <span>➕</span> Invite Mentor Account
          </Button>
        </div>

        {notice && (
          <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-lg text-sm border border-emerald-500/20 font-medium space-y-2">
            <p>✅ {notice}</p>
            {devInviteUrl && (
              <div className="pt-2 border-t border-emerald-500/20 text-xs">
                <span className="font-semibold block mb-1">Development Mode Invitation Link:</span>
                <a href={devInviteUrl} className="text-primary underline font-mono break-all">
                  {devInviteUrl}
                </a>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm border border-destructive/20 font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Filter Controls */}
        <Card className="p-6 border-border/50 bg-card space-y-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <Input
              type="text"
              placeholder="Search by name or email address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-lg"
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="p-2 bg-secondary border border-border rounded-lg text-xs text-foreground min-w-[150px]"
            >
              <option value="">All Roles</option>
              <option value="student">Student Only</option>
              <option value="mentor">Mentor Only</option>
              <option value="admin">Admin Only</option>
            </select>

            <Button type="submit" className="bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-full px-6">
              Search
            </Button>
          </form>
        </Card>

        {/* Users Table */}
        <Card className="p-6 border-border/50 bg-card space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="py-3 px-2">User Details</th>
                  <th className="py-3 px-2">Account Status</th>
                  <th className="py-3 px-2">Current Role</th>
                  <th className="py-3 px-2">Change Role</th>
                  <th className="py-3 px-2">Registered / Invited</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground animate-pulse">
                      Loading user data...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const status = u.computedStatus || u.accountStatus || "active";
                    return (
                      <tr key={u._id} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-3 px-2 font-medium text-foreground">
                          <div>{u.name}</div>
                          <div className="text-muted-foreground font-mono text-[11px]">{u.email}</div>
                          {u.phone && <div className="text-[10px] text-muted-foreground">📞 {u.phone}</div>}
                        </td>

                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            status === "active"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : status === "invited"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : status === "invite_expired"
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-muted text-muted-foreground border-border"
                          }`}>
                            {status === "active"
                              ? "Active"
                              : status === "invited"
                              ? "Invited (Pending)"
                              : status === "invite_expired"
                              ? "Invite Expired"
                              : "Disabled"}
                          </span>
                        </td>

                        <td className="py-3 px-2 font-bold uppercase tracking-wider">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            u.role === "admin"
                              ? "bg-purple-500/20 text-purple-600 dark:text-purple-400"
                              : u.role === "mentor"
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                              : "bg-primary/15 text-primary"
                          }`}>
                            {u.role || "student"}
                          </span>
                        </td>

                        <td className="py-3 px-2">
                          <select
                            value={u.role || "student"}
                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                            className="p-1.5 bg-secondary border border-border rounded text-xs text-foreground font-semibold"
                          >
                            <option value="student">Student</option>
                            <option value="mentor">Mentor</option>
                            <option value="admin">Administrator</option>
                          </select>
                        </td>

                        <td className="py-3 px-2 text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-2 text-right space-x-1">
                          {status === "invited" || status === "invite_expired" ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResendInvite(u._id)}
                                className="text-[11px] h-7 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-full"
                              >
                                Resend Invite
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevokeInvite(u._id)}
                                className="text-[11px] h-7 text-destructive hover:bg-destructive/10 rounded-full"
                              >
                                Revoke
                              </Button>
                            </>
                          ) : (
                            <>
                              {u.role === "student" && status === "active" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedStudent(u);
                                    setShowAssignModal(true);
                                  }}
                                  className="text-[11px] h-7 border-primary/30 text-primary hover:bg-primary/10 rounded-full"
                                >
                                  Assign Mentor
                                </Button>
                              )}

                              {u._id !== users[0]?._id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleStatus(u._id, status)}
                                  className={`text-[11px] h-7 rounded-full ${
                                    status === "disabled"
                                      ? "text-emerald-500 hover:bg-emerald-500/10"
                                      : "text-destructive hover:bg-destructive/10"
                                  }`}
                                >
                                  {status === "disabled" ? "Enable" : "Disable"}
                                </Button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Invite Mentor Account Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-6 border border-border bg-card space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-foreground">Invite Mentor Account</h3>
                <button onClick={() => setShowInviteModal(false)} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
              </div>
              <p className="text-xs text-muted-foreground">
                Create a secure mentor account invitation. The mentor will receive an email link to choose their own strong password.
              </p>

              <form onSubmit={handleInviteMentor} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">Mentor Full Name *</label>
                  <Input
                    type="text"
                    required
                    placeholder="Dr. Sarah Jenkins"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">Email Address *</label>
                  <Input
                    type="email"
                    required
                    placeholder="sarah.jenkins@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">Phone Number (Optional)</label>
                  <Input
                    type="text"
                    placeholder="+1 (555) 019-2834"
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">Specialization / Domain (Optional)</label>
                  <Input
                    type="text"
                    placeholder="System Design, Algorithms, Cloud Architecture"
                    value={inviteForm.specialization}
                    onChange={(e) => setInviteForm({ ...inviteForm, specialization: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowInviteModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={inviteLoading}
                    className="bg-gradient-to-r from-primary to-accent text-white font-semibold text-xs rounded-full"
                  >
                    {inviteLoading ? "Sending Invitation..." : "Send Mentor Invitation"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Mentor Assignment Modal */}
        {showAssignModal && selectedStudent && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-6 border border-border bg-card space-y-4">
              <h3 className="text-lg font-bold text-foreground">
                Assign Mentor to {selectedStudent.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                Select an active mentor to assign to student <span className="font-semibold text-foreground">{selectedStudent.email}</span>.
              </p>

              <form onSubmit={handleAssignMentor} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">Select Mentor</label>
                  {mentorsList.length === 0 ? (
                    <p className="text-xs text-amber-500">
                      No active mentor accounts currently available. Please invite a mentor account first.
                    </p>
                  ) : (
                    <select
                      value={selectedMentorId}
                      onChange={(e) => setSelectedMentorId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-secondary border border-border rounded-lg text-xs text-foreground"
                    >
                      <option value="">-- Select Active Mentor --</option>
                      {mentorsList.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedStudent(null);
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={assignLoading || mentorsList.length === 0}
                    className="bg-gradient-to-r from-primary to-accent text-white font-semibold text-xs rounded-full"
                  >
                    {assignLoading ? "Assigning..." : "Confirm Assignment"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

      </div>
    </RoleGuard>
  );
}
