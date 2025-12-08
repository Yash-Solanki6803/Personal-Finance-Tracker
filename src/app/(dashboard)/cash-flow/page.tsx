"use client";

import { useEffect, useState, useMemo } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { formatCurrency, roundToDecimal } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { addMonths, format, differenceInMonths } from "date-fns";

interface CashFlowProjection {
  month: string;
  income: number;
  expenses: number;
  investments: number;
  balance: number;
  cumulativeBalance: number;
  totalContributed?: number; // invested amount without interest
  projectedInvestmentValue?: number; // invested value with growth
}

function CashFlowPageContent() {
  const [salary, setSalary] = useState<number>(0);
  const [averageExpenses, setAverageExpenses] = useState<number>(0);
  const [investmentPlans, setInvestmentPlans] = useState<any[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<any[]>([]);
  const [projectionMonths, setProjectionMonths] = useState<number>(12);
  const [includeRecurring, setIncludeRecurring] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  // Extra user-controllable assumption: expected annual return for projections
  const [expectedAnnualReturn, setExpectedAnnualReturn] = useState<number>(6); // percent

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [salaryRes, transactionsRes, plansRes, recurringRes] = await Promise.all([
          fetch("/api/salary"),
          fetch("/api/transactions?limit=1000"),
          fetch("/api/investment-plans?status=active"),
          fetch("/api/recurring-transactions?isActive=true"),
        ]);

        if (salaryRes.ok) {
          const salaryData = await salaryRes.json();
          if (salaryData.success && salaryData.data) {
            setSalary(salaryData.data.amount || 0);
          }
        }

        if (transactionsRes.ok) {
          const transactionsData = await transactionsRes.json();
          if (transactionsData.success) {
            const payload = transactionsData.data;
            const list = Array.isArray(payload)
              ? payload
              : Array.isArray(payload?.transactions)
              ? payload.transactions
              : [];

            // Calculate average monthly expenses (last 3 months)
            const now = new Date();
            const threeMonthsAgo = addMonths(now, -3);
            const recentExpenses = list.filter(
              (t: any) =>
                t.type === "expense" &&
                new Date(t.date) >= threeMonthsAgo &&
                new Date(t.date) <= now
            );

            if (recentExpenses.length > 0) {
              const totalExpenses = recentExpenses.reduce(
                (sum: number, t: any) => sum + t.amount,
                0
              );
              const months = 3;
              setAverageExpenses(totalExpenses / months);
            } else {
              // Fallback: calculate from all expenses
              const allExpenses = list.filter((t: any) => t.type === "expense");
              if (allExpenses.length > 0) {
                const totalExpenses = allExpenses.reduce(
                  (sum: number, t: any) => sum + t.amount,
                  0
                );
                const oldestDate = new Date(
                  Math.min(...allExpenses.map((t: any) => new Date(t.date).getTime()))
                );
                const months = Math.max(
                  1,
                  Math.ceil(
                    (now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
                  )
                );
                setAverageExpenses(totalExpenses / months);
              }
            }
          }
        }

        if (plansRes.ok) {
          const plansData = await plansRes.json();
          if (plansData.success && Array.isArray(plansData.data)) {
            setInvestmentPlans(plansData.data);
          }
        }

        if (recurringRes.ok) {
          const recurringData = await recurringRes.json();
          if (recurringData.success && Array.isArray(recurringData.data)) {
            setRecurringTransactions(recurringData.data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate total monthly investment contributions (base)
  const totalMonthlyInvestments = useMemo(() => {
    return investmentPlans.reduce(
      (sum, plan) => sum + (plan.monthlyContribution || 0),
      0
    );
  }, [investmentPlans]);

  // Calculate invested to date from plans (based on plan.startDate if present)
  const totalInvestedToDate = useMemo(() => {
    const now = new Date();
    let total = 0;

    investmentPlans.forEach((plan) => {
      const monthly = plan.monthlyContribution || 0;
      if (!monthly) return;
      const start = plan.startDate ? new Date(plan.startDate) : null;
      let monthsActive = 0;
      if (start && !isNaN(start.getTime())) {
        monthsActive = Math.max(0, differenceInMonths(now, start) + 1);
      } else if (plan.startedMonthsAgo) {
        // fallback if API provides startedMonthsAgo
        monthsActive = plan.startedMonthsAgo;
      } else {
        // assume starts this month -> 0 months invested to date
        monthsActive = 0;
      }

      total += monthly * monthsActive;
    });

    return total;
  }, [investmentPlans]);

  // Calculate recurring transaction amounts
  const recurringAmounts = useMemo(() => {
    if (!includeRecurring) return { income: 0, expense: 0 };

    let income = 0;
    let expense = 0;

    recurringTransactions.forEach((rt) => {
      try {
        const transactionData = JSON.parse(rt.transactionData);
        if (transactionData.type === "income") {
          income += transactionData.amount || 0;
        } else {
          expense += transactionData.amount || 0;
        }
      } catch {
        // Ignore invalid JSON
      }
    });

    return { income, expense };
  }, [recurringTransactions, includeRecurring]);

  // Helper: build investment projection values (projected future value of contributions)
  const projectedInvestmentsSummary = useMemo(() => {
    // We'll compute: totalProjectedContributions and projectedFutureValue using monthly compounding
    const annualReturn = Math.max(0, expectedAnnualReturn) / 100;
    const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1; // monthly equivalent

    // Determine an annualIncrease for contributions — if plans provide annualIncreasePercent use weighted average
    let weightedIncreaseSum = 0;
    let weight = 0;
    investmentPlans.forEach((p) => {
      const contrib = p.monthlyContribution || 0;
      const ai = p.annualIncreasePercent || 0; // e.g. 5 for 5%
      if (contrib > 0) {
        weightedIncreaseSum += ai * contrib;
        weight += contrib;
      }
    });
    const avgAnnualIncrease = weight > 0 ? weightedIncreaseSum / weight / 100 : 0; // decimal

    // Project month by month (contribution may increase yearly by avgAnnualIncrease)
    let projectedFutureValue = 0;
    let totalProjectedContributions = 0;

    for (let m = 0; m < projectionMonths; m++) {
      const yearIndex = Math.floor(m / 12);
      const multiplier = Math.pow(1 + avgAnnualIncrease, yearIndex);
      const monthlyContributionThisMonth = totalMonthlyInvestments * multiplier;

      // futureValue accumulation: existing value grows, then new contribution added
      projectedFutureValue = projectedFutureValue * (1 + monthlyReturn) + monthlyContributionThisMonth;
      totalProjectedContributions += monthlyContributionThisMonth;
    }

    return {
      avgAnnualIncreasePercent: Math.round(avgAnnualIncrease * 10000) / 100, // show as percentage
      totalProjectedContributions: roundToDecimal(totalProjectedContributions),
      totalProjectedContributionsInclToDate: roundToDecimal(totalProjectedContributions + totalInvestedToDate),
      projectedFutureValue: roundToDecimal(projectedFutureValue + totalInvestedToDate), // include invested to date
    };
  }, [investmentPlans, totalMonthlyInvestments, projectionMonths, expectedAnnualReturn, totalInvestedToDate]);

  // Generate cash flow projection
  const projectionData = useMemo(() => {
    const data: CashFlowProjection[] = [];
    let cumulativeBalance = 0;
    const startDate = new Date();

    // For monthly projected investment value we will replicate the logic from projectedInvestmentsSummary
    const annualReturn = Math.max(0, expectedAnnualReturn) / 100;
    const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;

    let projectedInvestmentValue = totalInvestedToDate; // start with what already invested

    // average annual increase (decimal)
    let weightedIncreaseSum = 0;
    let weight = 0;
    investmentPlans.forEach((p) => {
      const contrib = p.monthlyContribution || 0;
      const ai = p.annualIncreasePercent || 0;
      if (contrib > 0) {
        weightedIncreaseSum += ai * contrib;
        weight += contrib;
      }
    });
    const avgAnnualIncrease = weight > 0 ? weightedIncreaseSum / weight / 100 : 0;

    // cumulative contributed (no interest) starts with invested to date
    let cumulativeContributed = totalInvestedToDate;

    for (let i = 0; i < projectionMonths; i++) {
      const monthDate = addMonths(startDate, i);
      const monthKey = format(monthDate, "MMM yyyy");

      const monthlyIncome = salary + recurringAmounts.income;
      const monthlyExpenses = averageExpenses + recurringAmounts.expense;

      // Monthly investments may increase annually by avgAnnualIncrease on each plan
      const yearIndex = Math.floor(i / 12);
      const multiplier = Math.pow(1 + avgAnnualIncrease, yearIndex);
      const monthlyInvestments = totalMonthlyInvestments * multiplier;

      // update projectedInvestmentValue (with interest)
      projectedInvestmentValue = projectedInvestmentValue * (1 + monthlyReturn) + monthlyInvestments;

      // update cumulativeContributed (without interest)
      cumulativeContributed += monthlyInvestments;

      const netCashFlow = monthlyIncome - monthlyExpenses - monthlyInvestments;

      cumulativeBalance += netCashFlow;

      data.push({
        month: monthKey,
        income: roundToDecimal(monthlyIncome),
        expenses: roundToDecimal(monthlyExpenses),
        investments: roundToDecimal(monthlyInvestments),
        balance: roundToDecimal(netCashFlow),
        cumulativeBalance: roundToDecimal(cumulativeBalance),
        totalContributed: roundToDecimal(cumulativeContributed),
        projectedInvestmentValue: roundToDecimal(projectedInvestmentValue),
      });
    }

    return data;
  }, [salary, averageExpenses, totalMonthlyInvestments, recurringAmounts, projectionMonths, expectedAnnualReturn, investmentPlans, totalInvestedToDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading cash flow data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cash Flow Projection</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Project your cash flow for the next 12-60 months based on current salary, expenses, and
          investments. Projections include simple monthly compounding on investments using expected
          annual return.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Projection Period</label>
            <div className="flex gap-2">
              {[12, 24, 36, 48, 60].map((months) => (
                <button
                  key={months}
                  onClick={() => setProjectionMonths(months)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    projectionMonths === months
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {months}M
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Options</label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeRecurring}
                onChange={(e) => setIncludeRecurring(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include Recurring Transactions</span>
            </label>

            <div className="mt-4">
              <label className="block text-sm text-gray-600 dark:text-gray-400">Expected annual return (%)</label>
              <input
                type="number"
                value={expectedAnnualReturn}
                onChange={(e) => setExpectedAnnualReturn(Number(e.target.value))}
                className="mt-1 block w-40 rounded-md border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm p-2"
              />
            </div>
          </div>
        </div>

        {/* Assumptions Display */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Projection Assumptions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Monthly Salary:</span>
              <span className="font-semibold text-gray-900 dark:text-white ml-2">{formatCurrency(salary)}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Avg. Monthly Expenses:</span>
              <span className="font-semibold text-gray-900 dark:text-white ml-2">{formatCurrency(averageExpenses)}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Monthly Investments:</span>
              <span className="font-semibold text-gray-900 dark:text-white ml-2">{formatCurrency(totalMonthlyInvestments)}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Invested to date:</span>
              <span className="font-semibold text-gray-900 dark:text-white ml-2">{formatCurrency(totalInvestedToDate)}</span>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
            <div>Projected contribution increase (avg yearly): {projectedInvestmentsSummary.avgAnnualIncreasePercent}%</div>
            <div>Projected contributions over period (new): {formatCurrency(projectedInvestmentsSummary.totalProjectedContributions)}</div>
            <div>Total contributed including past: {formatCurrency(projectedInvestmentsSummary.totalProjectedContributionsInclToDate)}</div>
            <div>Projected investment value (incl. invested to date): {formatCurrency(projectedInvestmentsSummary.projectedFutureValue)}</div>
          </div>
        </div>
      </div>

      {/* Cash Flow Chart */}
      {projectionData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Projected Cash Flow</h2>
          <ResponsiveContainer width="100%" height={440}>
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
              <Line type="monotone" dataKey="investments" stroke="#f59e0b" strokeWidth={2} name="Investments" />
              <Line type="monotone" dataKey="cumulativeBalance" stroke="#3b82f6" strokeWidth={3} name="Cumulative Balance" />
              <Line type="monotone" dataKey="projectedInvestmentValue" stroke="#8b5cf6" strokeWidth={2} name="Projected Investment Value" />
              <Line type="monotone" dataKey="totalContributed" stroke="#6b7280" strokeWidth={2} strokeDasharray="4 3" name="Total Contributed (no interest)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Projection Table */}
      {projectionData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Monthly Projection Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Month</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Income</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Expenses</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Investments</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Net Flow</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Cumulative</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Total Contributed</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Projected Invested Value</th>
                </tr>
              </thead>
              <tbody>
                {projectionData.map((row, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{row.month}</td>
                    <td className="py-3 px-4 text-sm text-right text-green-600 dark:text-green-400">{formatCurrency(row.income)}</td>
                    <td className="py-3 px-4 text-sm text-right text-red-600 dark:text-red-400">{formatCurrency(row.expenses)}</td>
                    <td className="py-3 px-4 text-sm text-right text-yellow-600 dark:text-yellow-400">{formatCurrency(row.investments)}</td>
                    <td className={`py-3 px-4 text-sm text-right font-semibold ${row.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{formatCurrency(row.balance)}</td>
                    <td className={`py-3 px-4 text-sm text-right font-semibold ${row.cumulativeBalance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>{formatCurrency(row.cumulativeBalance)}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-gray-700 dark:text-gray-300">{formatCurrency(row.totalContributed || 0)}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-purple-600 dark:text-purple-400">{formatCurrency(row.projectedInvestmentValue || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recurring Transactions / Diagnostics */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Cash Flow Diagnostics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded">
            <div className="text-gray-600 dark:text-gray-300">Recurring Income (monthly)</div>
            <div className="text-lg font-semibold">{formatCurrency(recurringAmounts.income)}</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded">
            <div className="text-gray-600 dark:text-gray-300">Recurring Expense (monthly)</div>
            <div className="text-lg font-semibold">{formatCurrency(recurringAmounts.expense)}</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded">
            <div className="text-gray-600 dark:text-gray-300">Average Expense (monthly)</div>
            <div className="text-lg font-semibold">{formatCurrency(averageExpenses)}</div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Recurring Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="py-2 px-3">Title</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                  <th className="py-2 px-3">Type</th>
                </tr>
              </thead>
              <tbody>
                {recurringTransactions.map((rt: any, idx: number) => {
                  let parsed: any = null;
                  try {
                    parsed = JSON.parse(rt.transactionData);
                  } catch {
                    parsed = { title: rt.title || "-", amount: 0, type: "expense" };
                  }

                  return (
                    <tr key={idx} className="border-t border-gray-100 dark:border-slate-800">
                      <td className="py-2 px-3">{parsed.title || rt.title || "Recurring"}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(parsed.amount || 0)}</td>
                      <td className="py-2 px-3">{parsed.type || "expense"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CashFlowPage() {
  return (
    <ProtectedPage>
      <CashFlowPageContent />
    </ProtectedPage>
  );
}
