"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { InvestmentPlanSchema } from "@/lib/schemas";
import * as z from "zod";

type FormValues = z.infer<typeof InvestmentPlanSchema>;

function NewInvestmentPlanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(InvestmentPlanSchema),
    defaultValues: {
      compoundingFrequency: "monthly",
      annualIncreasePercent: 0,
      status: "active",
      startDate: new Date(),
    },
  });

  // Pre-fill form if coming from goal
  useEffect(() => {
    const name = searchParams.get("name");
    const monthlyContribution = searchParams.get("monthlyContribution");
    const goalId = searchParams.get("goalId");

    if (name || monthlyContribution) {
      reset({
        name: name ? decodeURIComponent(name) : "",
        monthlyContribution: monthlyContribution ? Math.max(0, parseFloat(monthlyContribution) || 0) : 0,
        compoundingFrequency: "monthly",
        annualIncreasePercent: 10, // Default 10% annual increase when creating from goal
        status: "active",
        startDate: new Date(),
        expectedReturnMin: 10,
        expectedReturnMax: 12,
        goalId: goalId || undefined,
      });
    }
  }, [searchParams, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      setError(null);
      const payload = {
        name: data.name,
        monthlyContribution: data.monthlyContribution,
        expectedReturnMin: data.expectedReturnMin,
        expectedReturnMax: data.expectedReturnMax,
        compoundingFrequency: data.compoundingFrequency,
        annualIncreasePercent: data.annualIncreasePercent,
        status: data.status,
        startDate: data.startDate instanceof Date
          ? data.startDate.toISOString()
          : typeof data.startDate === 'string'
          ? new Date(data.startDate).toISOString()
          : new Date().toISOString(),
        endDate: data.endDate
          ? (data.endDate instanceof Date
              ? data.endDate.toISOString()
              : typeof data.endDate === 'string'
              ? new Date(data.endDate).toISOString()
              : undefined)
          : undefined,
        goalId: data.goalId || undefined,
      };

      const res = await fetch("/api/investment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed to create investment plan");

      router.push("/investment-plans");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          New Investment Plan
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Create a new investment plan with monthly contributions and expected returns.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card rounded-lg border border-border p-8 space-y-6 shadow-sm"
      >
        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Plan Name <span className="text-destructive">*</span>
          </label>
          <input
            {...register("name")}
            className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            placeholder="e.g., Mutual Fund SIP"
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Monthly Contribution and Status Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Monthly Contribution <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              {...register("monthlyContribution", { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="0.00"
            />
            {errors.monthlyContribution && (
              <p className="text-xs text-destructive mt-1">
                {errors.monthlyContribution.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Status <span className="text-destructive">*</span>
            </label>
            <select
              {...register("status")}
              className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
            {errors.status && (
              <p className="text-xs text-destructive mt-1">
                {errors.status.message}
              </p>
            )}
          </div>
        </div>

        {/* Expected Returns Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Expected Return (Min %) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              {...register("expectedReturnMin", { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="0.00"
            />
            {errors.expectedReturnMin && (
              <p className="text-xs text-destructive mt-1">
                {errors.expectedReturnMin.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Expected Return (Max %) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              {...register("expectedReturnMax", { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="0.00"
            />
            {errors.expectedReturnMax && (
              <p className="text-xs text-destructive mt-1">
                {errors.expectedReturnMax.message}
              </p>
            )}
          </div>
        </div>

        {/* Compounding Frequency and Annual Increase Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Compounding Frequency <span className="text-destructive">*</span>
            </label>
            <select
              {...register("compoundingFrequency")}
              className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
            {errors.compoundingFrequency && (
              <p className="text-xs text-destructive mt-1">
                {errors.compoundingFrequency.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Annual Increase (%) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              {...register("annualIncreasePercent", { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="0.00"
            />
            {errors.annualIncreasePercent && (
              <p className="text-xs text-destructive mt-1">
                {errors.annualIncreasePercent.message}
              </p>
            )}
          </div>
        </div>

        {/* Start Date and End Date Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Start Date <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              {...register("startDate", {
                valueAsDate: false,
                setValueAs: (value) => {
                  if (!value) return new Date();
                  const date = new Date(value);
                  return isNaN(date.getTime()) ? new Date() : date;
                },
              })}
              defaultValue={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
            {errors.startDate && (
              <p className="text-xs text-destructive mt-1">
                {errors.startDate.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              End Date <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              type="date"
              {...register("endDate", {
                setValueAs: (value) => {
                  if (!value) return undefined;
                  const date = new Date(value);
                  return isNaN(date.getTime()) ? undefined : date;
                },
              })}
              className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
            {errors.endDate && (
              <p className="text-xs text-destructive mt-1">
                {errors.endDate.message}
              </p>
            )}
          </div>
        </div>

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
            {isSubmitting ? "Creating..." : "Create Plan"}
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

export default function NewInvestmentPlanPage() {
  return (
    <ProtectedPage>
      <NewInvestmentPlanForm />
    </ProtectedPage>
  );
}
