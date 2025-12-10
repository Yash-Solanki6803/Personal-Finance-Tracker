"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedPage } from "@/components/ProtectedPage";
import InvestmentPlanCompare from "@/components/InvestmentPlanCompare";
import { toast } from "sonner";

export default function InvestmentPlansComparePage() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [leftPlan, setLeftPlan] = useState<any>(null);
  const [rightPlan, setRightPlan] = useState<any>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      const res = await fetch('/api/investment-plans');
      const body = await res.json();
      if (res.ok && body.success) setPlans(body.data || []);
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    const fetchPlan = async (id: string | null, setter: any) => {
      if (!id) return setter(null);
      const res = await fetch(`/api/investment-plans/${id}`);
      const body = await res.json();
      if (res.ok && body.success) setter(body.data);
    };
    fetchPlan(leftId, setLeftPlan);
    fetchPlan(rightId, setRightPlan);
  }, [leftId, rightId]);

  // small projection generator for demo: create monthly values from startDate to endDate
  const buildProjection = (plan: any) => {
    if (!plan) return [];
    const start = new Date(plan.startDate || new Date());
    const end = new Date(plan.endDate || addYears(new Date(), 5));
    const points: any[] = [];
    let cur = new Date(start);
    while (cur <= end) {
      const monthKey = cur.toISOString().substring(0,7)+"-01";
      // simplistic projection: monthlyContribution * months + small growth
      const months = ((cur.getFullYear() - start.getFullYear()) * 12) + (cur.getMonth() - start.getMonth());
      const invested = (plan.monthlyContribution || 0) * Math.max(0, months+1);
      const value = invested * (1 + ((plan.expectedReturnMin || 0)/100) * ((months+1)/12));
      points.push({ month: monthKey, value });
      cur.setMonth(cur.getMonth() + 1);
    }
    return points;
  };

  const handleSavePlan = async (planId: string | null) => {
    if (!planId) return;
    setSavingId(planId);
    try {
      // Remove "(copy)" suffix and make it active
      const plan = planId === leftId ? leftPlan : rightPlan;
      const newName = plan.name.replace(' (copy)', '');
      const res = await fetch(`/api/investment-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, status: 'active' }),
      });
      if (!res.ok) throw new Error('Failed to save plan');
      setError(null);
      toast.success('Plan saved successfully');
      router.push('/investment-plans');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingId(null);
    }
  };

  const handleDiscardPlan = async (planId: string | null) => {
    if (!planId || !confirm('Discard this what-if plan?')) return;
    setSavingId(planId);
    try {
      const res = await fetch(`/api/investment-plans/${planId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to discard plan');
      setError(null);
      toast.success('Plan discarded');
      if (planId === leftId) setLeftId(null);
      else setRightId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discard');
    } finally {
      setSavingId(null);
    }
  };

  const leftWithProj = leftPlan ? { ...leftPlan, projection: buildProjection(leftPlan) } : null;
  const rightWithProj = rightPlan ? { ...rightPlan, projection: buildProjection(rightPlan) } : null;

  return (
    <ProtectedPage>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Compare Investment Plans</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Select two plans (original and what-if) to compare projections side-by-side. Save or discard the what-if scenario.</p>
          </div>
          <Link href="/investment-plans" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            Back
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-800">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Original Plan</label>
            <select value={leftId || ""} onChange={(e) => setLeftId(e.target.value || null)} className="w-full p-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg">
              <option value="">Select original plan</option>
              {plans.filter(p => !p.name.includes('(copy)')).map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What-If Plan</label>
            <select value={rightId || ""} onChange={(e) => setRightId(e.target.value || null)} className="w-full p-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg">
              <option value="">Select what-if plan</option>
              {plans.filter(p => p.name.includes('(copy)')).map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <InvestmentPlanCompare left={leftWithProj} right={rightWithProj} />

        {rightPlan && rightPlan.name.includes('(copy)') && (
          <div className="flex gap-4 justify-center p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg">
            <button
              onClick={() => handleSavePlan(rightId)}
              disabled={savingId === rightId}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Save What-If Plan
            </button>
            <button
              onClick={() => handleDiscardPlan(rightId)}
              disabled={savingId === rightId}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Discard Plan
            </button>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}

// helper not to import in top (small local implementation)
function addYears(d: Date, y: number) { const n = new Date(d); n.setFullYear(n.getFullYear()+y); return n; }
