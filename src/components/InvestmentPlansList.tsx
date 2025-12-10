"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Pause, Play, Archive, Edit, Trash2 } from "lucide-react";

export interface InvestmentPlan {
  id: string;
  name: string;
  monthlyContribution: number;
  expectedReturnMin?: number | null;
  expectedReturnMax?: number | null;
  compoundingFrequency?: string | null;
  annualIncreasePercent?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
}

export function InvestmentPlansList() {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const url = statusFilter !== "all"
        ? `/api/investment-plans?status=${statusFilter}`
        : "/api/investment-plans";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch investment plans");
      const data = await res.json();
      if (data.success) {
        const payload = data.data;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.investmentPlans)
          ? payload.investmentPlans
          : [];
        setPlans(list);
      } else setError(data.message || "Failed to load plans");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [statusFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/investment-plans/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to update status");
      }
      // Refresh list
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this investment plan? This cannot be undone.")) return;
    const previous = plans;
    setPlans((p) => p.filter((x) => x.id !== id));
    setDeletingId(id);
    try {
      const res = await fetch(`/api/investment-plans/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to delete plan");
      }
      // Refresh list
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setPlans(previous);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/investment-plans/${id}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to duplicate plan");
      }
      // Refresh list
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const getStatusBadgeColor = (status: string | null | undefined) => {
    switch (status) {
      case "active":
        return "bg-success/20 text-success";
      case "paused":
        return "bg-warning/20 text-warning";
      case "archived":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="text-muted-foreground">Loading investment plans...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-card-foreground">Investment Plans</h2>
        <Link
          href="/investment-plans/new"
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
        >
          + Add Plan
        </Link>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-input bg-card text-foreground rounded-lg"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {plans.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No investment plans found.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-lg bg-secondary/50 border border-border hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground mb-1">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(
                        p.status
                      )}`}
                    >
                      {p.status || "active"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.compoundingFrequency || "Monthly"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monthly Contribution:</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(p.monthlyContribution || 0)}
                  </span>
                </div>
                {p.expectedReturnMin !== null && p.expectedReturnMin !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expected Return:</span>
                    <span className="font-semibold text-foreground">
                      {p.expectedReturnMin}% - {p.expectedReturnMax || p.expectedReturnMin}%
                    </span>
                  </div>
                )}
                {p.startDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="text-foreground">
                      {new Date(p.startDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  {/* Status Change Buttons */}
                  {p.status === "active" && (
                    <button
                      onClick={() => handleStatusChange(p.id, "paused")}
                      disabled={updatingId === p.id}
                      className="p-2 text-warning hover:bg-warning/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Pause"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  )}
                  {p.status === "paused" && (
                    <button
                      onClick={() => handleStatusChange(p.id, "active")}
                      disabled={updatingId === p.id}
                      className="p-2 text-success hover:bg-success/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Resume"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  {p.status !== "archived" && (
                    <button
                      onClick={() => handleStatusChange(p.id, "archived")}
                      disabled={updatingId === p.id}
                      className="p-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
                      title="Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/investment-plans/${p.id}/edit`}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDuplicate(p.id)}
                    className="p-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                    title="Duplicate"
                  >
                    {/* simple duplicate icon using Archive as placeholder */}
                    <Archive className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
