"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SalaryInputSchema } from "@/lib/schemas";
import * as z from "zod";
import { formatCurrency } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { toast } from "sonner";

type SalaryFormValues = z.infer<typeof SalaryInputSchema>;

interface SalaryRecord {
  id: string;
  amount: number;
  lastUpdatedDate: string;
  createdAt: string;
}

function SalaryPageContent() {
  const [currentSalary, setCurrentSalary] = useState<SalaryRecord | null>(null);
  const [salaryHistory, setSalaryHistory] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SalaryFormValues>({
    resolver: zodResolver(SalaryInputSchema),
    defaultValues: {
      lastUpdatedDate: new Date(),
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [currentRes, historyRes] = await Promise.all([
          fetch("/api/salary"),
          fetch("/api/salary/history"),
        ]);

        if (currentRes.ok) {
          const currentData = await currentRes.json();
          if (currentData.success && currentData.data) {
            setCurrentSalary(currentData.data);
            reset({
              amount: currentData.data.amount,
              lastUpdatedDate: new Date(currentData.data.lastUpdatedDate),
            });
          }
        }

        if (historyRes.ok) {
          const historyData = await historyRes.json();
          if (historyData.success && Array.isArray(historyData.data)) {
            setSalaryHistory(historyData.data);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [reset]);

  const onSubmit = async (data: SalaryFormValues) => {
    try {
      setSaving(true);
      setError(null);

      // Convert date to ISO string
      let dateValue: string;
      if (data.lastUpdatedDate instanceof Date) {
        dateValue = data.lastUpdatedDate.toISOString();
      } else if (typeof data.lastUpdatedDate === 'string') {
        // If it's a date string from input, convert to ISO
        dateValue = new Date(data.lastUpdatedDate).toISOString();
      } else {
        dateValue = new Date().toISOString();
      }

      // Create new salary record (always create new, don't update existing)
      const res = await fetch("/api/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: data.amount,
          lastUpdatedDate: dateValue,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed to update salary");

      // Refresh data
      const [currentRes, historyRes] = await Promise.all([
        fetch("/api/salary"),
        fetch("/api/salary/history"),
      ]);

      if (currentRes.ok) {
        const currentData = await currentRes.json();
        if (currentData.success && currentData.data) {
          setCurrentSalary(currentData.data);
        }
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        if (historyData.success && Array.isArray(historyData.data)) {
          setSalaryHistory(historyData.data);
        }
      }

      toast.success("Salary updated successfully!");
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  // Prepare chart data
  const chartData = salaryHistory
    .map((record) => ({
      date: format(new Date(record.lastUpdatedDate), "MMM yyyy"),
      amount: record.amount,
      fullDate: record.lastUpdatedDate,
    }))
    .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading salary data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Salary Management</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Track and update your monthly take-home salary.
        </p>
      </div>

      {/* Current Salary Display */}
      {currentSalary && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Salary
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(currentSalary.amount)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Last updated: {format(new Date(currentSalary.lastUpdatedDate), "MMMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Update Salary Form */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Update Salary
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Monthly Salary Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              {...register("amount", { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
            {errors.amount && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {errors.amount.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Effective Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register("lastUpdatedDate", {
                valueAsDate: false,
              })}
              defaultValue={format(new Date(), "yyyy-MM-dd")}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.lastUpdatedDate && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {errors.lastUpdatedDate.message}
              </p>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Update Salary"}
          </button>
        </form>
      </div>

      {/* Salary History Chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Salary History Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Salary"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Salary History Table */}
      {salaryHistory.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Salary History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {salaryHistory.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {format(new Date(record.lastUpdatedDate), "MMMM d, yyyy")}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(record.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalaryPage() {
  return (
    <ProtectedPage>
      <SalaryPageContent />
    </ProtectedPage>
  );
}

