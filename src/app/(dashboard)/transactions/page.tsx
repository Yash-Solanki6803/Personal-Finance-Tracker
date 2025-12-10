import { ProtectedPage } from "@/components/ProtectedPage";
import Link from "next/link";
import { TransactionsList } from "@/components/TransactionsList";

export default function TransactionsPage() {
  return (
    <ProtectedPage>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
            <p className="text-sm text-muted-foreground mt-2">Manage your income and expenses. View, add, and track all your financial transactions.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/transactions/new" className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors text-center">+ Add Transaction</Link>
            <Link href="/recurring-transactions" className="px-3 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-accent transition-colors">Manage Recurring</Link>
          </div>
        </div>

        <TransactionsList />
      </div>
    </ProtectedPage>
  );
}
