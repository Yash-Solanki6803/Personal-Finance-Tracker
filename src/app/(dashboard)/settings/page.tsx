import { ProtectedPage } from "@/components/ProtectedPage";
import Link from "next/link";
import { DollarSign, Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <ProtectedPage>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage your application settings and preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/settings/salary"
            className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">
                  Salary Management
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
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
