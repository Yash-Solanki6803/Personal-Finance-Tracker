import { ProtectedPage } from "@/components/ProtectedPage";
import Link from "next/link";
import { DollarSign, Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <ProtectedPage>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Manage your application settings and preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/settings/salary"
            className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Salary Management
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Update your monthly salary and view history
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </ProtectedPage>
  );
}

