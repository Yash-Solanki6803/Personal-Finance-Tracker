"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BudgetRuleSchema } from "@/lib/schemas";
import * as z from "zod";
import { formatCurrency } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";

type BudgetRuleFormValues = z.infer<typeof BudgetRuleSchema>;

interface BudgetAnalysis {
  needs: { actual: number; budget: number; percentage: number; remaining: number };
  wants: { actual: number; budget: number; percentage: number; remaining: number };
  savings: { actual: number; budget: number; percentage: number; remaining: number };
  totalIncome: number;
  totalExpense: number;
}

function BudgetPageContent() {
  const [activeTab, setActiveTab] = useState<"rules" | "analysis">("analysis");
  const [budgetRule, setBudgetRule] = useState<{ needsPercent: number; wantsPercent: number; savingsPercent: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<BudgetRuleFormValues>({
    resolver: zodResolver(BudgetRuleSchema),
  });

  const needsPercent = watch("needsPercent");
  const wantsPercent = watch("wantsPercent");
  const savingsPercent = watch("savingsPercent");
  const totalPercent = (needsPercent || 0) + (wantsPercent || 0) + (savingsPercent || 0);

  // Fetch budget rule
  useEffect(() => {
    const fetchBudgetRule = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/budget-rules");
        if (!res.ok) throw new Error("Failed to fetch budget rule");
        const data = await res.json();
        if (data.success && data.data) {
          const rule = data.data;
          setBudgetRule(rule);
          reset({
            needsPercent: rule.needsPercent,
            wantsPercent: rule.wantsPercent,
            savingsPercent: rule.savingsPercent,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchBudgetRule();
  }, [reset]);

  // Fetch budget analysis
  const fetchAnalysis = async (month: string) => {
    try {
      setLoadingAnalysis(true);
      const res = await fetch(`/api/analytics/monthly-summary?month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch analysis");
      const data = await res.json();

      if (data.success && data.data && data.data.budgetAllocation) {
        const summary = data.data;
        const allocation = summary.budgetAllocation;

        if (summary.totalIncome > 0) {
          setAnalysis({
            needs: {
              actual: allocation.needs?.actual || 0,
              budget: allocation.needs?.budget || 0,
              percentage: allocation.needs?.percentage || 0,
              remaining: (allocation.needs?.budget || 0) - (allocation.needs?.actual || 0),
            },
            wants: {
              actual: allocation.wants?.actual || 0,
              budget: allocation.wants?.budget || 0,
              percentage: allocation.wants?.percentage || 0,
              remaining: (allocation.wants?.budget || 0) - (allocation.wants?.actual || 0),
            },
            savings: {
              actual: allocation.savings?.actual || 0,
              budget: allocation.savings?.budget || 0,
              percentage: allocation.savings?.percentage || 0,
              remaining: (allocation.savings?.budget || 0) - (allocation.savings?.actual || 0),
            },
            totalIncome: summary.totalIncome,
            totalExpense: summary.totalExpense,
          });
        } else {
          setAnalysis(null);
        }
      } else {
        setAnalysis(null);
      }
    } catch (err) {
      console.error("Failed to fetch analysis", err);
      setAnalysis(null);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  useEffect(() => {
    if (selectedMonth) {
      fetchAnalysis(selectedMonth);
    }
  }, [selectedMonth]);

  const onSubmit = async (data: BudgetRuleFormValues) => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/budget-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed to update budget rule");

      setBudgetRule(data);
      // Refresh analysis
      if (selectedMonth) {
        fetchAnalysis(selectedMonth);
      }
      toast.success("Budget rule updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  // Prepare chart data
  const pieChartData = analysis
    ? [
        { name: "Needs", value: analysis.needs.actual, budget: analysis.needs.budget, color: "#ef4444" },
        { name: "Wants", value: analysis.wants.actual, budget: analysis.wants.budget, color: "#f59e0b" },
        { name: "Savings", value: analysis.savings.actual, budget: analysis.savings.budget, color: "#10b981" },
      ]
    : [];

  const comparisonData = analysis
    ? [
        {
          category: "Needs",
          budget: analysis.needs.budget,
          actual: analysis.needs.actual,
          remaining: analysis.needs.remaining,
        },
        {
          category: "Wants",
          budget: analysis.wants.budget,
          actual: analysis.wants.actual,
          remaining: analysis.wants.remaining,
        },
        {
          category: "Savings",
          budget: analysis.savings.budget,
          actual: analysis.savings.actual,
          remaining: analysis.savings.remaining,
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading budget settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Budget Management</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Configure your budget rules and analyze your spending patterns.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("analysis")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "analysis"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            Budget Analysis
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "rules"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            Budget Rules
          </button>
        </nav>
      </div>

      {/* Budget Analysis Tab */}
      {activeTab === "analysis" && (
        <div className="space-y-6">
          {/* Month Selector */}
          <div className="bg-card rounded-lg border border-border p-4">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Select Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-input bg-card text-foreground rounded-lg"
              aria-label="Select month for budget analysis"
            />
          </div>

          {loadingAnalysis ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-muted-foreground">Loading analysis...</div>
            </div>
          ) : analysis ? (
            <>
              {/* Pie Chart */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-xl font-bold text-card-foreground mb-6">
                  Expense Breakdown
                </h2>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Progress Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {["needs", "wants", "savings"].map((category) => {
                  const data = analysis[category as keyof BudgetAnalysis] as {
                    actual: number;
                    budget: number;
                    percentage: number;
                    remaining: number;
                  };
                  const usagePercent = data.budget > 0 ? (data.actual / data.budget) * 100 : 0;
                  const isOverBudget = data.actual > data.budget;

                  return (
                    <div
                      key={category}
                      className="bg-card rounded-lg border border-border p-6"
                    >
                      <h3 className="text-lg font-semibold text-card-foreground mb-4 capitalize">
                        {category}
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Budget:</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(data.budget)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Spent:</span>
                          <span
                            className={`font-semibold ${
                              isOverBudget
                                ? "text-destructive"
                                : "text-foreground"
                            }`}
                          >
                            {formatCurrency(data.actual)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Remaining:</span>
                          <span
                            className={`font-semibold ${
                              data.remaining < 0
                                ? "text-destructive"
                                : "text-success"
                            }`}
                          >
                            {formatCurrency(data.remaining)}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              isOverBudget ? "bg-destructive" : "bg-primary"
                            }`}
                            style={{
                              width: `${Math.min(usagePercent, 100)}%`,
                            }}
                            role="progressbar"
                            aria-valuenow={Math.round(Math.min(usagePercent, 100))}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Budget usage for ${category}`}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {usagePercent.toFixed(1)}% of budget used
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Comparison Chart */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-xl font-bold text-card-foreground mb-6">
                  Budget vs Actual
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="budget" fill="#3b82f6" name="Budget" />
                    <Bar dataKey="actual" fill="#ef4444" name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="bg-card rounded-lg border border-border p-8 text-center">
              <p className="text-muted-foreground">
                No data available for the selected month.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Budget Rules Tab */}
      {activeTab === "rules" && (
        <div className="bg-card rounded-lg border border-border p-8">
          <h2 className="text-xl font-bold text-card-foreground mb-6">
            Budget Rule Configuration
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Needs Percentage <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...register("needsPercent", { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.needsPercent && (
                <p className="text-xs text-destructive mt-1">
                  {errors.needsPercent.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Wants Percentage <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...register("wantsPercent", { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.wantsPercent && (
                <p className="text-xs text-destructive mt-1">
                  {errors.wantsPercent.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Savings Percentage <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...register("savingsPercent", { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.savingsPercent && (
                <p className="text-xs text-destructive mt-1">
                  {errors.savingsPercent.message}
                </p>
              )}
            </div>

            {/* Total Percentage Indicator */}
            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">
                  Total:
                </span>
                <span
                  className={`text-lg font-bold ${
                    totalPercent === 100
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {totalPercent.toFixed(1)}%
                </span>
              </div>
              {totalPercent !== 100 && (
                <p className="text-xs text-destructive mt-1">
                  Total must equal 100%
                </p>
              )}
            </div>

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || totalPercent !== 100}
              className="w-full px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Budget Rule"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function BudgetPage() {
  return (
    <ProtectedPage>
      <BudgetPageContent />
    </ProtectedPage>
  );
}
