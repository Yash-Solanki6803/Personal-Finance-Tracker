"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { ProtectedPage } from "@/components/ProtectedPage";
import { format } from "date-fns";

const RecurringFormSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  type: z.enum(["income", "expense"]),
  description: z.string().optional(),
  frequency: z.enum(["once", "daily", "weekly", "monthly", "yearly"]),
  nextDueDate: z.string().min(1, "Next due date is required"),
});

type FormValues = z.infer<typeof RecurringFormSchema>;

function RecurringTransactionsForm({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(RecurringFormSchema),
    defaultValues: {
      type: "expense",
      nextDueDate: new Date().toISOString().split("T")[0],
    },
  });

  const onSubmit = async (data: FormValues) => {
    setError(null);
    setCreating(true);
    try {
      const payload = {
        transactionData: JSON.stringify({
          amount: Number(data.amount),
          category: data.category,
          type: data.type,
          description: data.description,
        }),
        frequency: data.frequency,
        nextDueDate: new Date(data.nextDueDate).toISOString(),
        isActive: true,
      };

      const res = await fetch("/api/recurring-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Failed to create recurring transaction");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-card rounded-lg border border-border p-8 space-y-6 shadow-sm max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Amount <span className="text-destructive">*</span></label>
          <input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
          {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Category <span className="text-destructive">*</span></label>
          <input {...register("category")} className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
          {errors.category && <p className="text-xs text-destructive mt-1">{errors.category.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Type</label>
          <select {...register("type")} className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Frequency</label>
          <select {...register("frequency")} className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
            <option value="yearly">Yearly</option>
            <option value="once">Once</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Next Due Date</label>
          <input type="date" {...register("nextDueDate")} className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
          {errors.nextDueDate && <p className="text-xs text-destructive mt-1">{errors.nextDueDate.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">Description <span className="text-muted-foreground">(optional)</span></label>
        <textarea {...register("description")} rows={3} className="w-full px-4 py-2 border border-input bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
      </div>

      {error && <div className="p-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm">{error}</div>}

      <div className="flex items-center gap-3 pt-6 border-t border-border">
        <button type="submit" disabled={isSubmitting || creating} className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg disabled:opacity-50 transition-colors">{isSubmitting || creating ? "Saving..." : "Save Recurring"}</button>
        <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-border text-foreground font-semibold rounded-lg hover:bg-accent transition-colors">Cancel</button>
      </div>
    </form>
  );
}

export default function RecurringTransactionsPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recurring-transactions");
      if (!res.ok) throw new Error("Failed to fetch");
      const body = await res.json();
      if (body.success) setList(body.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/recurring-transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await fetchList();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete recurring rule?")) return;
    try {
      const res = await fetch(`/api/recurring-transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchList();
    } catch (e) { console.error(e); }
  };

  return (
    <ProtectedPage>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recurring Transactions</h1>
          <p className="text-sm text-muted-foreground mt-2">Manage recurring rules that auto-create transactions.</p>
        </div>

        <RecurringTransactionsForm onCreated={fetchList} />

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold text-card-foreground mb-4">Active Recurring Transactions</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No recurring rules found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{(() => { try { const t=JSON.parse(r.transactionData); return `${t.type === 'income' ? '+' : '-'} ${t.amount} ${t.category}` } catch { return r.transactionData }})()}</div>
                    <div className="text-sm text-muted-foreground">Frequency: {r.frequency}</div>
                    <div className="text-sm text-muted-foreground">Next: {format(new Date(r.nextDueDate), 'PPP')}</div>
                    <div className="text-sm">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {r.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(r.id, r.isActive)} className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors font-medium">{r.isActive ? 'Pause' : 'Resume'}</button>
                    <button onClick={() => handleDelete(r.id)} className="px-4 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors font-medium">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedPage>
  );
}
