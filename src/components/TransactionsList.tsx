"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Trash2, Edit, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { TransactionType } from "@/lib/enums";

interface Transaction {
  id: string;
  amount: number;
  category: string;
  type: string;
  description?: string;
  date: string;
  recurringId?: string | null;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export function TransactionsList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories?type=expense");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data.map((cat: any) => ({ id: cat.id, name: cat.name })));
        }
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      });

      if (typeFilter !== "all") {
        params.append("type", typeFilter);
      }
      if (categoryFilter !== "all") {
        params.append("category", categoryFilter);
      }
      if (startDate) {
        params.append("startDate", startDate);
      }
      if (endDate) {
        params.append("endDate", endDate);
      }

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const data = await res.json();
      if (data.success) {
        const payload = data.data;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.transactions)
          ? payload.transactions
          : [];

        // Client-side sorting (API doesn't support sort parameter yet)
        const sorted = [...list].sort((a, b) => {
          let comparison = 0;
          switch (sortBy) {
            case "date":
              comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
              break;
            case "amount":
              comparison = a.amount - b.amount;
              break;
            case "category":
              comparison = a.category.localeCompare(b.category);
              break;
            default:
              comparison = 0;
          }
          return sortOrder === "asc" ? comparison : -comparison;
        });

        setTransactions(sorted);

        if (payload.pagination) {
          setPagination(payload.pagination);
        }
      } else {
        setError(data.message || "Failed to load transactions");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [pagination.offset, typeFilter, categoryFilter, startDate, endDate, sortBy, sortOrder]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction? This action cannot be undone.")) return;

    const previous = transactions;
    setTransactions((t) => t.filter((x) => x.id !== id));
    setDeletingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to delete transaction");
      }
      // Refresh list
      fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setTransactions(previous);
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetFilters = () => {
    setTypeFilter("all");
    setCategoryFilter("all");
    setStartDate("");
    setEndDate("");
    setSortBy("date");
    setSortOrder("desc");
    setPagination({ ...pagination, offset: 0 });
  };

  const handleExport = async (format: 'csv' | 'json' | 'xml') => {
    try {
      const params = new URLSearchParams({ format });
      if (categoryFilter !== 'all') {
        params.append('categories', categoryFilter);
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const response = await fetch(`/api/transactions/export?${params.toString()}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleBulkAction = async () => {
    if (selectedIds.size === 0) {
      setError('No transactions selected');
      return;
    }
    if (!bulkAction) {
      setError('Please select an action');
      return;
    }

    try {
      const res = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: bulkAction,
          transactionIds: Array.from(selectedIds),
          newCategory: bulkCategory || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Bulk action failed');
      }

      setSelectedIds(new Set());
      setBulkAction('');
      setBulkCategory('');
      fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk action failed');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="text-muted-foreground">Loading transactions...</div>
      </div>
    );
  }

  // Calculate totals
  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === TransactionType.INCOME) {
        acc.income += t.amount;
      } else if (t.type === TransactionType.EXPENSE) {
        acc.expenses += t.amount;
      } else if (t.type === TransactionType.INVESTMENT) {
        acc.investments += t.amount;
      }
      return acc;
    },
    { income: 0, expenses: 0, investments: 0 }
  );

  const netBalance = totals.income - totals.expenses - totals.investments;

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-card-foreground">Transactions</h2>
        <Link
          href="/transactions/new"
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
        >
          + Add Transaction
        </Link>
      </div>

      {/* Totals Summary */}
      {transactions.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-success/10 border border-success/30">
            <p className="text-xs font-medium text-success/80 mb-1">Total Income</p>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(totals.income)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-xs font-medium text-destructive/80 mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(totals.expenses)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-xs font-medium text-primary/80 mb-1">Total Investments</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totals.investments)}
            </p>
          </div>
          <div className={`p-4 rounded-lg border ${
            netBalance >= 0
              ? 'bg-success/10 border-success/30'
              : 'bg-destructive/10 border-destructive/30'
          }`}>
            <p className={`text-xs font-medium mb-1 ${
              netBalance >= 0 ? 'text-success/80' : 'text-destructive/80'
            }`}>
              Net Balance
            </p>
            <p className={`text-2xl font-bold ${
              netBalance >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 space-y-4 p-4 bg-secondary/50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPagination({ ...pagination, offset: 0 });
              }}
              className="w-full px-3 py-2 text-sm border border-input bg-card text-foreground rounded-lg"
              aria-label="Filter by transaction type"
            >
              <option value="all">All</option>
              <option value={TransactionType.INCOME}>Income</option>
              <option value={TransactionType.EXPENSE}>Expense</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPagination({ ...pagination, offset: 0 });
              }}
              className="w-full px-3 py-2 text-sm border border-input bg-card text-foreground rounded-lg"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPagination({ ...pagination, offset: 0 });
              }}
              className="w-full px-3 py-2 text-sm border border-input bg-card text-foreground rounded-lg"
              aria-label="Filter by start date"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPagination({ ...pagination, offset: 0 });
              }}
              className="w-full px-3 py-2 text-sm border border-input bg-card text-foreground rounded-lg"
              aria-label="Filter by end date"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 text-sm border border-input bg-card text-foreground rounded-lg"
                aria-label="Sort transactions by"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="category">Category</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                className="px-3 py-2 text-sm border border-input bg-card text-foreground rounded-lg"
                aria-label="Sort order"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              Reset Filters
            </button>
            <div className="flex items-center gap-1 border-l border-border pl-2">
              <button
                onClick={() => handleExport('csv')}
                className="px-3 py-2 text-sm flex items-center gap-1 text-foreground hover:bg-accent rounded-lg transition-colors"
                title="Export as CSV"
              >
                <Download className="w-4 h-4" /> CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="px-3 py-2 text-sm flex items-center gap-1 text-foreground hover:bg-accent rounded-lg transition-colors"
                title="Export as JSON"
              >
                <Download className="w-4 h-4" /> JSON
              </button>
              <button
                onClick={() => handleExport('xml')}
                className="px-3 py-2 text-sm flex items-center gap-1 text-foreground hover:bg-accent rounded-lg transition-colors"
                title="Export as XML"
              >
                <Download className="w-4 h-4" /> XML
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {transactions.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No transactions found.
        </p>
      ) : (
        <>
          {selectedIds.size > 0 && (
            <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between">
              <div className="text-sm text-primary">
                {selectedIds.size} transaction{selectedIds.size !== 1 ? 's' : ''} selected
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="px-3 py-2 text-sm border border-input bg-card text-foreground rounded-lg"
                  aria-label="Bulk action for selected transactions"
                >
                  <option value="">Select Action...</option>
                  <option value="delete">Delete Selected</option>
                  <option value="categorize">Categorize As...</option>
                </select>
                {bulkAction === 'categorize' && (
                  <select
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="px-3 py-2 text-sm border border-input bg-card text-foreground rounded-lg"
                    aria-label="Category for bulk categorization"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction || (bulkAction === 'categorize' && !bulkCategory)}
                  className="px-4 py-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    setSelectedIds(new Set());
                    setBulkAction('');
                    setBulkCategory('');
                  }}
                  className="px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <input
                type="checkbox"
                checked={selectedIds.size === transactions.length && transactions.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-border"
                title="Select all"
              />
              <span className="text-xs text-muted-foreground">
                {selectedIds.size > 0 ? 'Deselect all' : 'Select all'}
              </span>
            </div>
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary transition-colors border border-border"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(t.id)}
                  onChange={(e) => {
                    const newIds = new Set(selectedIds);
                    if (e.target.checked) {
                      newIds.add(t.id);
                    } else {
                      newIds.delete(t.id);
                    }
                    setSelectedIds(newIds);
                  }}
                  className="w-4 h-4 rounded border-border"
                  aria-label={`Select transaction ${t.description || t.category}`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        t.type === TransactionType.INCOME
                          ? "bg-success"
                          : "bg-destructive"
                      }`}
                    >
                      {t.category.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {t.category}
                      </p>
                      {t.recurringId && (
                        <div className="inline-block ml-2 px-2 py-0.5 text-xs font-medium bg-warning/20 text-warning rounded">
                          Recurring
                        </div>
                      )}
                      {t.description && (
                        <p className="text-sm text-muted-foreground">
                          {t.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(t.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p
                      className={`font-semibold text-lg ${
                        t.type === TransactionType.INCOME
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {t.type === TransactionType.INCOME ? "+" : "-"}
                      {formatCurrency(t.amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/transactions/${t.id}/edit`}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                      aria-label="Delete transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Showing {pagination.offset + 1} to{" "}
                {Math.min(pagination.offset + pagination.limit, pagination.total)} of{" "}
                {pagination.total} transactions
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPagination({
                      ...pagination,
                      offset: Math.max(0, pagination.offset - pagination.limit),
                    })
                  }
                  disabled={pagination.offset === 0}
                  className="p-2 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setPagination({
                      ...pagination,
                      offset: pagination.offset + pagination.limit,
                    })
                  }
                  disabled={!pagination.hasMore}
                  className="p-2 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
