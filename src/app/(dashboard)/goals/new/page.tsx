"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { GoalInputSchema } from "@/lib/schemas";
import { GoalStatus } from "@/lib/enums";
import * as z from "zod";
import { formatCurrency } from "@/lib/utils";
import { calculateRequiredSIP } from "@/lib/goal-calculations";

type FormValues = z.infer<typeof GoalInputSchema>;

function NewGoalForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [requiredSIP, setRequiredSIP] = useState<number>(0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(GoalInputSchema),
    defaultValues: {
      status: GoalStatus.ON_TRACK,
    },
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

  const onSubmit = async (data: FormValues) => {
    try {
      setError(null);

      // Convert date to ISO string
      let dateValue: string | undefined;
      if (data.targetDate) {
        if (data.targetDate instanceof Date) {
          dateValue = data.targetDate.toISOString();
        } else if (typeof data.targetDate === 'string') {
          dateValue = new Date(data.targetDate).toISOString();
        }
      }

      const targetAmountValue = typeof data.targetAmount === "number"
        ? data.targetAmount
        : Number(data.targetAmount);

      if (isNaN(targetAmountValue) || targetAmountValue <= 0) {
        setError("Invalid target amount");
        return;
      }

      const payload = {
        name: data.name || "",
        targetAmount: targetAmountValue,
        targetDate: dateValue || new Date().toISOString(),
        description: data.description || undefined,
        status: data.status || GoalStatus.ON_TRACK,
      };

      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed to create goal");

      router.push("/goals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          New Financial Goal
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Set a financial goal and calculate the required monthly SIP to achieve it.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card rounded-lg border border-border p-8 space-y-6 shadow-sm"
      >
        {/* Goal Name */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Goal Name <span className="text-destructive">*</span>
          </label>
          <input
            {...register("name")}
            className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            placeholder="e.g., Buy a House, Retirement Fund"
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Target Amount and Date Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Target Amount <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              {...register("targetAmount", { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="0.00"
            />
            {errors.targetAmount && (
              <p className="text-xs text-destructive mt-1">
                {errors.targetAmount.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Target Date <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              {...register("targetDate", {
                valueAsDate: false,
              })}
              className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
            {errors.targetDate && (
              <p className="text-xs text-destructive mt-1">
                {errors.targetDate.message}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Description <span className="text-muted-foreground">(optional)</span>
          </label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Add notes about this goal..."
            className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
          />
        </div>

        {/* Required SIP Display */}
        {requiredSIP > 0 && (
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-sm font-semibold text-primary mb-1">
              Required Monthly SIP
            </p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(requiredSIP)}
            </p>
            <p className="text-xs text-primary/80 mt-1">
              Assumes 12% annual return with monthly compounding
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-6 border-t border-border">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Creating..." : "Create Goal"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-border text-foreground font-semibold rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewGoalPage() {
  return (
    <ProtectedPage>
      <NewGoalForm />
    </ProtectedPage>
  );
}
