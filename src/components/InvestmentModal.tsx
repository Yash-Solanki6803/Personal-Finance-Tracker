"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { X } from "lucide-react";

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
  monthlyContribution: number;
  onSuccess: () => void;
}

export function InvestmentModal({
  isOpen,
  onClose,
  planId,
  planName,
  monthlyContribution,
  onSuccess,
}: InvestmentModalProps) {
  const [amount, setAmount] = useState(monthlyContribution.toString());
  const [skipMonthlyCheck, setSkipMonthlyCheck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error("Please enter a valid amount");
      }

      const res = await fetch(`/api/investment-plans/${planId}/invest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          skipMonthlyCheck,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to invest");
      }

      // Success
      onSuccess();
      onClose();
      setAmount(monthlyContribution.toString());
      setSkipMonthlyCheck(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invest");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setAmount(monthlyContribution.toString());
      setSkipMonthlyCheck(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full mx-4 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Invest in {planName}
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Investment Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all disabled:opacity-50"
              placeholder="0.00"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Suggested: {formatCurrency(monthlyContribution)}
            </p>
          </div>

          {/* Skip Monthly Check */}
          <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
            <input
              type="checkbox"
              id="skipMonthlyCheck"
              checked={skipMonthlyCheck}
              onChange={(e) => setSkipMonthlyCheck(e.target.checked)}
              disabled={loading}
              className="mt-0.5 w-4 h-4 rounded border-border"
            />
            <label htmlFor="skipMonthlyCheck" className="text-sm text-foreground">
              <div className="font-medium">Additional Investment</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Check this if you've already made your monthly investment and
                want to add extra funds
              </div>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? "Processing..." : "Invest Now"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-border text-foreground font-medium rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
