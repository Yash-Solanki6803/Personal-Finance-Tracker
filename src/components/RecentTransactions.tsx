"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  description?: string;
  date: string;
}

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/transactions?limit=5&offset=0");

        if (!response.ok) throw new Error("Failed to fetch transactions");

        const data = await response.json();
        if (data.success) {
          // API may return either an array directly or an object { transactions, pagination }
          const payload = data.data;
          const list = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.transactions)
            ? payload.transactions
            : [];
          setTransactions(list);
        } else {
          setError(data.message || "Failed to load transactions");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold text-card-foreground mb-4">
          Recent Transactions
        </h2>
        <div className="space-y-3">
          {Array(5)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="h-16 bg-muted rounded animate-pulse"
              />
            ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold text-card-foreground mb-4">
          Recent Transactions
        </h2>
        <div className="text-destructive text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-card-foreground">
          Recent Transactions
        </h2>
        <Link
          href="/transactions"
          className="text-primary hover:underline text-sm font-medium"
        >
          View All
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No transactions yet. Add your first transaction to get started!
        </p>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      transaction.type === "income"
                        ? "bg-success"
                        : "bg-destructive"
                    }`}
                  >
                    {transaction.category.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {transaction.category}
                    </p>
                    {transaction.description && (
                      <p className="text-sm text-muted-foreground">
                        {transaction.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`font-bold ${
                    transaction.type === "income"
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {transaction.type === "income" ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(transaction.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
