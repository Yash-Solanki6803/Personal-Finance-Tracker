"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { calculateGoalProgress } from "@/lib/goal-calculations";
import { format } from "date-fns";
import { Edit, Trash2, Plus, TrendingUp } from "lucide-react";

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  description?: string;
  status: string;
}

function GoalsPageContent() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [investmentPlans, setInvestmentPlans] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [goalsRes, plansRes] = await Promise.all([
          fetch("/api/goals"),
          fetch("/api/investment-plans?status=active"),
        ]);

        if (goalsRes.ok) {
          const goalsData = await goalsRes.json();
          if (goalsData.success && Array.isArray(goalsData.data)) {
            setGoals(goalsData.data);
          }
        }

        if (plansRes.ok) {
          const plansData = await plansRes.json();
          if (plansData.success && Array.isArray(plansData.data)) {
            setInvestmentPlans(plansData.data);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this goal? This action cannot be undone.")) return;
    const previous = goals;
    setGoals((g) => g.filter((x) => x.id !== id));
    setDeletingId(id);
    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to delete goal");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setGoals(previous);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/20 text-success";
      case "on_track":
        return "bg-primary/20 text-primary";
      case "behind":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "on_track":
        return "On Track";
      case "behind":
        return "Behind";
      default:
        return "Unknown";
    }
  };

  // Calculate progress for each goal
  const goalsWithProgress = goals.map((goal) => {
    // Only sum SIPs that are linked to this specific goal
    const linkedSIPs = investmentPlans.filter(
      (plan) => plan.goalId === goal.id
    );
    const totalMonthlySIP = linkedSIPs.reduce(
      (sum, plan) => sum + (plan.monthlyContribution || 0),
      0
    );
    const progress = calculateGoalProgress(
      goal.targetAmount,
      new Date(goal.targetDate),
      0, // Current investments (simplified - could be calculated from actual investments)
      totalMonthlySIP,
      12 // Default 12% return
    );
    return { ...goal, progress };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading goals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Goals</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Set and track your financial goals with progress monitoring.
          </p>
        </div>
        <Link
          href="/goals/new"
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </Link>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
          {error}
        </div>
      )}

      {goals.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No goals found. Create your first financial goal to get started!
          </p>
          <Link
            href="/goals/new"
            className="inline-block px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
          >
            Create Goal
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goalsWithProgress.map((goal) => {
            const progressPercent = Math.min(goal.progress.progressPercent, 100);
            const isCompleted = goal.progress.status === "completed";

            return (
              <div
                key={goal.id}
                className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-card-foreground mb-1">
                      {goal.name}
                    </h3>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {goal.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(
                          goal.progress.status
                        )}`}
                      >
                        {getStatusLabel(goal.progress.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/goals/${goal.id}/edit`}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      disabled={deletingId === goal.id}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Target Amount:</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(goal.targetAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Target Date:</span>
                    <span className="text-foreground">
                      {format(new Date(goal.targetDate), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Required Monthly SIP:</span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(goal.progress.requiredSIP)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Projected Value:</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(goal.progress.projectedValue)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="pt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-muted-foreground">
                        {progressPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          isCompleted
                            ? "bg-success"
                            : goal.progress.status === "on_track"
                            ? "bg-primary"
                            : "bg-destructive"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Create SIP from Goal */}
                  <Link
                    href={`/investment-plans/new?goalId=${goal.id}&monthlyContribution=${goal.progress.requiredSIP}&name=${encodeURIComponent(goal.name)}`}
                    className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-success hover:bg-success/90 text-success-foreground rounded-lg text-sm font-medium transition-colors"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Create SIP from Goal
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  return (
    <ProtectedPage>
      <GoalsPageContent />
    </ProtectedPage>
  );
}
