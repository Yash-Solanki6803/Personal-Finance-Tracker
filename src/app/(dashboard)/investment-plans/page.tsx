import { ProtectedPage } from "@/components/ProtectedPage";
import { InvestmentPlansList } from "@/components/InvestmentPlansList";
import Link from "next/link";
import { TrendingUp } from "lucide-react";

export default function InvestmentPlansPage() {
  return (
    <ProtectedPage>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Investment Plans</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Manage your recurring investments and plans. Create, edit, pause or archive plans.</p>
          </div>
          <Link
            href="/investment-plans/projections"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            View Projections
          </Link>
        </div>

        <InvestmentPlansList />
      </div>
    </ProtectedPage>
  );
}
