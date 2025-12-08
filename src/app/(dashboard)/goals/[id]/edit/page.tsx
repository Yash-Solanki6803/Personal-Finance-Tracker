"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProtectedPage } from "@/components/ProtectedPage";
import { GoalUpdateSchema } from "@/lib/schemas";
import * as z from "zod";
import { formatCurrency } from "@/lib/utils";
import { calculateRequiredSIP } from "@/lib/goal-calculations";

type FormValues = z.infer<typeof GoalUpdateSchema>;

function EditGoalForm() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiredSIP, setRequiredSIP] = useState<number>(0);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(GoalUpdateSchema),
  });

  const targetAmount = watch("targetAmount");
  const targetDate = watch("targetDate");

  // Calculate required SIP when target amount or date changes
  useEffect(() => {
    if (targetAmount && targetDate) {
      try {
        const date = targetDate instanceof Date ? targetDate : new Date(targetDate);
        const sip = calculateRequiredSIP(targetAmount, date, 12, "monthly");
        setRequiredSIP(sip);
      } catch {
        setRequiredSIP(0);
      }
    } else {
      setRequiredSIP(0);
    }
  }, [targetAmount, targetDate]);

  useEffect(() => {
    if (!id) return;

    const fetchGoal = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/goals/${id}`);
        if (!res.ok) throw new Error("Failed to fetch goal");
        const data = await res.json();
        if (data.success && data.data) {
          const goal = data.data;
          reset({
            name: goal.name,
            targetAmount: goal.targetAmount,
            targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split("T")[0] : undefined,
            description: goal.description || "",
            status: goal.status || "on_track",
          });
        } else {
          setError(data.message || "Goal not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchGoal();
  }, [id, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      setError(null);
      const payload: any = {};
      
      if (data.name !== undefined) payload.name = data.name;
      if (data.targetAmount !== undefined) {
        payload.targetAmount = typeof data.targetAmount === "number" 
          ? data.targetAmount 
          : Number(data.targetAmount);
      }
      if (data.targetDate !== undefined) {
        let dateValue: string;
        if (data.targetDate instanceof Date) {
          dateValue = data.targetDate.toISOString();
        } else if (typeof data.targetDate === 'string') {
          dateValue = new Date(data.targetDate).toISOString();
        } else {
          dateValue = new Date().toISOString();
        }
        payload.targetDate = dateValue;
      }
      if (data.description !== undefined) payload.description = data.description || null;
      if (data.status !== undefined) payload.status = data.status;
      
      const res = await fetch(`/api/goals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed to update goal");
      
      router.push("/goals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading goal...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Edit Goal
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Update your financial goal details.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-8 space-y-6 shadow-sm"
      >
        {/* Goal Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Goal Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register("name")}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
            placeholder="e.g., Buy a House, Retirement Fund"
          />
          {errors.name && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Target Amount and Date Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Target Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              {...register("targetAmount", { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
              placeholder="0.00"
            />
            {errors.targetAmount && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {errors.targetAmount.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Target Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register("targetDate", {
                valueAsDate: false,
              })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
            />
            {errors.targetDate && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {errors.targetDate.message}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Description <span className="text-gray-500">(optional)</span>
          </label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Add notes about this goal..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all resize-none"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            {...register("status")}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
          >
            <option value="on_track">On Track</option>
            <option value="behind">Behind</option>
            <option value="completed">Completed</option>
          </select>
          {errors.status && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {errors.status.message}
            </p>
          )}
        </div>

        {/* Required SIP Display */}
        {requiredSIP > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
              Required Monthly SIP
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(requiredSIP)}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Assumes 12% annual return with monthly compounding
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-slate-800">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EditGoalPage() {
  return (
    <ProtectedPage>
      <EditGoalForm />
    </ProtectedPage>
  );
}

