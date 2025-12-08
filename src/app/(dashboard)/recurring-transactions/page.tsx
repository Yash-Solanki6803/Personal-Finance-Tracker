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
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-8 space-y-6 shadow-sm max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Amount <span className="text-red-500">*</span></label>
          <input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} className="w-full px-4 py-2 border rounded-lg" />
          {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Category <span className="text-red-500">*</span></label>
          <input {...register("category")} className="w-full px-4 py-2 border rounded-lg" />
          {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Type</label>
          <select {...register("type")} className="w-full px-4 py-2 border rounded-lg">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Frequency</label>
          <select {...register("frequency")} className="w-full px-4 py-2 border rounded-lg">
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
            <option value="yearly">Yearly</option>
            <option value="once">Once</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Next Due Date</label>
          <input type="date" {...register("nextDueDate")} className="w-full px-4 py-2 border rounded-lg" />
          {errors.nextDueDate && <p className="text-xs text-red-600 mt-1">{errors.nextDueDate.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description <span className="text-gray-500">(optional)</span></label>
        <textarea {...register("description")} rows={3} className="w-full px-4 py-2 border rounded-lg" />
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}

      <div className="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-slate-800">
        <button type="submit" disabled={isSubmitting || creating} className="px-6 py-2 bg-blue-600 text-white rounded-lg">{isSubmitting || creating ? "Saving..." : "Save Recurring"}</button>
        <button type="button" onClick={() => router.back()} className="px-6 py-2 border rounded-lg">Cancel</button>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recurring Transactions</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Manage recurring rules that auto-create transactions.</p>
        </div>

        <RecurringTransactionsForm onCreated={fetchList} />

        <div className="bg-white dark:bg-slate-900 rounded-lg border p-4">
          {loading ? (
            <div>Loading...</div>
          ) : list.length === 0 ? (
            <div>No recurring rules found.</div>
          ) : (
            <div className="space-y-3">
              {list.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">{(() => { try { const t=JSON.parse(r.transactionData); return `${t.type === 'income' ? '+' : '-'} ${t.amount} ${t.category}` } catch { return r.transactionData }})()}</div>
                    <div className="text-sm text-gray-500">Next: {format(new Date(r.nextDueDate), 'PPP')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(r.id, r.isActive)} className="px-3 py-1 border rounded">{r.isActive ? 'Pause' : 'Resume'}</button>
                    <button onClick={() => handleDelete(r.id)} className="px-3 py-1 border rounded text-red-600">Delete</button>
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
