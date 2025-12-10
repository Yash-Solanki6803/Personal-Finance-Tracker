"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ProtectedPage } from "@/components/ProtectedPage";

const TransactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  type: z.enum(["income", "expense"]),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
});

type FormValues = z.infer<typeof TransactionSchema>;

export default function EditTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(TransactionSchema),
  });

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [txRes, catRes] = await Promise.all([
          fetch(`/api/transactions/${id}`),
          fetch(`/api/categories`),
        ]);
        if (!txRes.ok) throw new Error("Failed to fetch transaction");
        const txBody = await txRes.json();
        if (!txBody.success) throw new Error(txBody.message || "Failed to load transaction");

        const tx = txBody.data;

        const catBody = await catRes.json();
        const cats = catBody.success && Array.isArray(catBody.data) ? catBody.data : [];
        setCategories(cats.map((c: any) => ({ id: c.id, name: c.name })));

        // Populate form
        reset({
          amount: tx.amount,
          category: tx.category,
          type: tx.type,
          description: tx.description || "",
          date: new Date(tx.date).toISOString().slice(0, 10),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      setError(null);
      const amount = parseFloat(data.amount.toString());
      if (isNaN(amount) || amount <= 0) {
        setError("Invalid amount");
        return;
      }
      const payload = { ...data, date: new Date(data.date).toISOString(), amount };
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed to update transaction");
      router.push("/transactions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <ProtectedPage>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Edit Transaction</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
            <select {...register("type")} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white p-2">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            {errors.type && <p className="text-xs text-red-600">{errors.type.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
            <input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white p-2" />
            {errors.amount && <p className="text-xs text-red-600">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
            <select {...register("category")} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white p-2">
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-red-600">{errors.category.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
            <input type="date" {...register("date")} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white p-2" />
            {errors.date && <p className="text-xs text-red-600">{errors.date.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea {...register("description")} rows={3} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white p-2" />
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md">{isSubmitting ? "Saving..." : "Save"}</button>
            <button type="button" onClick={() => router.back()} className="px-4 py-2 border rounded-md">Cancel</button>
          </div>
        </form>
      </div>
    </ProtectedPage>
  );
}
