"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";

const TransactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  type: z.enum(["income", "expense"], {
    message: "Type must be income or expense",
  }),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
});

type FormValues = z.infer<typeof TransactionSchema> & {
  makeRecurring?: boolean;
  frequency?: "once" | "daily" | "weekly" | "monthly" | "yearly";
  nextDueDate?: string;
  recurringEndDate?: string;
};

function NewTransactionForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCategories(
            data.data.map((cat: any) => ({ id: cat.id, name: cat.name }))
          );
        }
      } catch (err) {
        console.error("Failed to fetch categories", err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(TransactionSchema),
    defaultValues: {
      type: "expense",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setError(null);
      const amount = parseFloat(data.amount.toString());
      if (isNaN(amount) || amount <= 0) {
        setError("Invalid amount");
        return;
      }
      const payload: any = {
        ...data,
        amount,
        date: new Date(data.date).toISOString(),
      };

      // If user chose to make this transaction recurring, create the recurring rule first
      if ((data as any).makeRecurring) {
        const recurringPayload = {
          transactionData: JSON.stringify({
            amount,
            category: data.category,
            type: data.type,
            description: data.description,
          }),
          frequency: (data as any).frequency || "monthly",
          nextDueDate: new Date((data as any).nextDueDate || data.date).toISOString(),
          isActive: true,
        };

        const rres = await fetch("/api/recurring-transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(recurringPayload),
        });
        const rbody = await rres.json().catch(() => null);
        if (!rres.ok) throw new Error(rbody?.message || "Failed to create recurring rule");
        // attach recurringId to transaction payload
        payload.recurringId = rbody.data?.id;
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed to create transaction");
      router.push("/transactions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Add Transaction
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Create a new income or expense record.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-8 space-y-6 shadow-sm"
      >
        {/* Type and Amount Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register("type")}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            {errors.type && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {errors.type.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("amount", { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
            />
            {errors.amount && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {errors.amount.message}
              </p>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            {...register("category")}
            disabled={loadingCategories}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all disabled:opacity-50"
          >
            <option value="">
              {loadingCategories ? "Loading categories..." : "Select a category"}
            </option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {errors.category.message}
            </p>
          )}
        </div>

        {/* Recurring option */}
        <div className="mt-4 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" {...register("makeRecurring") as any} className="h-4 w-4" />
            <span className="text-sm font-medium">Make this a recurring transaction</span>
          </label>

          {/* Show recurring fields when checkbox checked - use watch from react-hook-form */}
          <RecurringFields show={watch("makeRecurring")} register={register as any} errors={errors as any} />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            {...register("date")}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
          />
          {errors.date && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {errors.date.message}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Description <span className="text-gray-500">(optional)</span>
          </label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Add notes about this transaction..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all resize-none"
          />
        </div>

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
            {isSubmitting ? "Saving..." : "Save Transaction"}
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

export default function NewTransactionPage() {
  return (
    <ProtectedPage>
      <NewTransactionForm />
    </ProtectedPage>
  );
}

function RecurringFields({ show, register, errors }: any) {
  if (!show) return null;

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
        <input type="date" {...register("nextDueDate")} className="w-full px-4 py-2 border rounded-lg" />
        {errors.nextDueDate && <p className="text-xs text-red-600 mt-1">{errors.nextDueDate.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">(Optional) End Date</label>
        <input type="date" {...register("recurringEndDate")} className="w-full px-4 py-2 border rounded-lg" />
      </div>
    </div>
  );
}
