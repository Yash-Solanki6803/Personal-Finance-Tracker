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
import { useMemo } from "react";
import { toast } from "sonner";

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

        const [summaryRes, plansRes, transactionsRes, salaryRes] = await Promise.all([
          fetch(`/api/analytics/monthly-summary?month=${dateParam}`),
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
        {/* Total Income */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                Total Income
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {formatCurrency(summary.totalIncome)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                Total Expense
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {formatCurrency(summary.totalExpense)}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        {/* Net Savings */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                Net Savings
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {formatCurrency(summary.netSavings)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
                {summary.transactionCount}
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

      {/* Net Worth Timeline */}
      {(() => {
        if (transactions.length === 0 || investmentPlans.length === 0) return null;

        // Calculate monthly transactions
        const monthlyData: Record<string, { income: number; expense: number }> = {};
        transactions.forEach((t: any) => {
          const monthKey = new Date(t.date).toISOString().substring(0, 7);
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { income: 0, expense: 0 };
          }
          if (t.type === "income") {
            monthlyData[monthKey].income += t.amount;
          } else {
            monthlyData[monthKey].expense += t.amount;
          }
        });

        // Calculate investment value (simplified - using current year projection)
        const totalMonthlyContribution = investmentPlans.reduce(
          (sum, plan) => sum + (plan.monthlyContribution || 0),
          0
        );
        const months = Object.keys(monthlyData).sort();
        const netWorthData = months.map((month, index) => {
          const data = monthlyData[month];
          const cumulativeCash = months.slice(0, index + 1).reduce(
            (sum, m) => sum + (monthlyData[m].income - monthlyData[m].expense),
            0
          );
          // Simplified investment calculation (assuming 10% annual return)
          const investmentValue = totalMonthlyContribution * (index + 1) * 1.1;
          return {
            month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            cash: cumulativeCash,
            investments: investmentValue,
            netWorth: cumulativeCash + investmentValue,
          };
        });

        return netWorthData.length > 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Net Worth Timeline
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={netWorthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="cash" stroke="#3b82f6" name="Cash" />
                <Line type="monotone" dataKey="investments" stroke="#10b981" name="Investments" />
                <Line type="monotone" dataKey="netWorth" stroke="#8b5cf6" strokeWidth={2} name="Net Worth" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null;
      })()}

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

export default function DashboardPage() {
  return (
    <ProtectedPage>
      <DashboardContent />
    </ProtectedPage>
  );
}
