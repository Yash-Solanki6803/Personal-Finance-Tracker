"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { RecentTransactions } from "@/components/RecentTransactions";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart as PieChartIcon,
  Download,
} from "lucide-react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { toast } from "sonner";

// import useFinancialCalculations from "@/hooks/useFinancialCalculations";

interface MonthlySummary {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  categoryBreakdown: Record<
    string,
    {
      total: number;
      percentage: number;
    }
  >;
  budgetAllocation: Record<
    string,
    {
      budget: number;
      actual: number;
      percentage: number;
    }
  >;
  transactionCount: number;
}

function DashboardContent() {
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<{ bankBalance: number; minNetWorth: number; maxNetWorth: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [investmentPlans, setInvestmentPlans] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await fetch("/api/export/xlsx");
      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      // Get the filename from response header
      const contentDisposition = response.headers.get("content-disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : `FinanceTracker_Export_${new Date().toISOString().split("T")[0]}.xlsx`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Data exported successfully!");
    } catch (err) {
      toast.error("Failed to export data: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const year = today.getFullYear();
        const dateParam = `${year}-${month}`;

        const [summaryRes, dashboardRes, plansRes, transactionsRes, salaryRes] = await Promise.all([
          fetch(`/api/analytics/monthly-summary?month=${dateParam}`),
          fetch("/api/dashboard/summary"),
          fetch("/api/investment-plans?status=active"),
          fetch("/api/transactions?limit=1000"),
          fetch("/api/salary/history"),
        ]);

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          if (summaryData.success) {
            setSummary(summaryData.data);
          }
        }

        if (dashboardRes.ok) {
          const dashboardData = await dashboardRes.json();
          if (dashboardData.success) {
            setDashboardSummary(dashboardData.data);
          }
        }

        if (plansRes.ok) {
          const plansData = await plansRes.json();
          if (plansData.success && Array.isArray(plansData.data)) {
            setInvestmentPlans(plansData.data);
          }
        }

        if (transactionsRes.ok) {
          const transactionsData = await transactionsRes.json();
          if (transactionsData.success) {
            const payload = transactionsData.data;
            const list = Array.isArray(payload)
              ? payload
              : Array.isArray(payload?.transactions)
              ? payload.transactions
              : [];
            setTransactions(list);
          }
        }

        if (salaryRes.ok) {
          const salaryData = await salaryRes.json();
          if (salaryData.success && Array.isArray(salaryData.data)) {
            setSalaryHistory(salaryData.data);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
        {error}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-gray-500 dark:text-gray-400">
        No data available for this month
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Welcome back! Here's your financial overview.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          {exporting ? "Exporting..." : "Export to XLSX"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Bank Balance */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                Bank Balance
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {dashboardSummary ? formatCurrency(dashboardSummary.bankBalance) : "-"}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Min Net Worth */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                Min Net Worth
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {dashboardSummary ? formatCurrency(dashboardSummary.minNetWorth) : "-"}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Max Net Worth */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                Max Net Worth
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {dashboardSummary ? formatCurrency(dashboardSummary.maxNetWorth) : "-"}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <PieChartIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Transaction Count */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                Transactions
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {summary ? summary.transactionCount : "-"}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <PieChartIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Income/Expense/Savings Pie Chart */}
      {summary && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Monthly Overview
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: "Income", value: summary.totalIncome, color: "#10b981" },
                  { name: "Expenses", value: summary.totalExpense, color: "#ef4444" },
                  { name: "Savings", value: Math.max(0, summary.netSavings), color: "#3b82f6" },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
                <Cell fill="#3b82f6" />
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Net Worth Timeline (backend-driven) */}
      <NetWorthTimelineChart />

      {/* Salary History Trend (Mini Chart) */}
      {salaryHistory.length > 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Salary History Trend
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={salaryHistory
                .map((s) => ({
                  date: new Date(s.lastUpdatedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
                  amount: s.amount,
                }))
                .reverse()}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Budget Allocation */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Budget Allocation (50-30-20)
        </h2>

        <div className="space-y-4">
          {Object.entries(summary.budgetAllocation).map(
            ([category, data]) => (
              <div key={category}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 dark:text-gray-300 font-medium capitalize">
                    {category}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    {formatCurrency(data.actual)} / {formatCurrency(data.budget)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      data.actual <= data.budget
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.min((data.actual / data.budget) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatPercentage(data.percentage / 100)} of budget
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/transactions/new" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-center">
            + Add Transaction
          </Link>
          <Link href="/investment-plans/new" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-center">
            + Investment Plan
          </Link>
          <Link href="/goals/new" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-center">
            + Goal
          </Link>
          <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors" disabled>
            View Reports
          </button>
        </div>
      </div>

      {/* Recent Transactions */}
      <RecentTransactions />
    </div>
  );
}

// Net Worth Timeline Chart Component
function NetWorthTimelineChart() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/dashboard/net-worth-timeline");
        if (!res.ok) throw new Error("Failed to fetch net worth timeline");
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          setTimeline(body.data);
        } else {
          throw new Error(body.message || "Invalid response");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, []);

  if (loading) return <div className="my-8 text-gray-500 dark:text-gray-400">Loading net worth timeline...</div>;
  if (error) return <div className="my-8 text-red-600 dark:text-red-400">{error}</div>;
  if (!timeline.length) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6 my-8">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Net Worth Timeline</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={timeline}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(value) => formatCurrency(value)} />
          <Tooltip formatter={(value) => formatCurrency(value as number)} />
          <Legend />
          <Line type="monotone" dataKey="cash" stroke="#3b82f6" name="Cash" />
          <Line type="monotone" dataKey="investmentsMin" stroke="#10b981" name="Investments (Min)" />
          <Line type="monotone" dataKey="investmentsMax" stroke="#22d3ee" name="Investments (Max)" />
          <Line type="monotone" dataKey="netWorthMin" stroke="#8b5cf6" strokeWidth={2} name="Net Worth (Min)" />
          <Line type="monotone" dataKey="netWorthMax" stroke="#f59e42" strokeWidth={2} name="Net Worth (Max)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedPage>
      <DashboardContent />
    </ProtectedPage>
  );
}
