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
  totalContributed?: number;
  totalInvestmentValue?: number;
  projectedInvestmentValue?: number;
}

interface InvestmentPlan {
  id: string;
  monthlyContribution: number;
  annualIncreasePercent?: number;
  startDate?: string;
  startedMonthsAgo?: number;
}

interface RecurringTransaction {
  id: string;
  transactionData: string;
  frequency: string;
  nextDueDate: string;
  isActive: boolean;
  title?: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  date: string;
  category?: string;
  description?: string;
}

function CashFlowPageContent() {
  const [salary, setSalary] = useState<number>(0);
  const [averageExpenses, setAverageExpenses] = useState<number>(0);
  const [investmentPlans, setInvestmentPlans] = useState<InvestmentPlan[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [projectionMonths, setProjectionMonths] = useState<number>(12);
  const [includeRecurring, setIncludeRecurring] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [expectedAnnualReturn, setExpectedAnnualReturn] = useState<number>(6);

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
            const list: Transaction[] = Array.isArray(payload)
              ? payload
              : Array.isArray(payload?.transactions)
              ? payload.transactions
              : [];

            const now = new Date();
            const threeMonthsAgo = addMonths(now, -3);
            const recentExpenses = list.filter(
              (t) =>
                t.type === "expense" &&
                new Date(t.date) >= threeMonthsAgo &&
                new Date(t.date) <= now
            );

            if (recentExpenses.length > 0) {
              const totalExpenses = recentExpenses.reduce(
                (sum, t) => sum + t.amount,
                0
              );
              const months = 3;
              setAverageExpenses(totalExpenses / months);
            } else {
              const allExpenses = list.filter((t) => t.type === "expense");
              if (allExpenses.length > 0) {
                const totalExpenses = allExpenses.reduce(
                  (sum, t) => sum + t.amount,
                  0
                );
                const oldestDate = new Date(
                  Math.min(...allExpenses.map((t) => new Date(t.date).getTime()))
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

  const totalMonthlyInvestments = useMemo(() => {
    return investmentPlans.reduce(
      (sum, plan) => sum + (plan.monthlyContribution || 0),
      0
    );
  }, [investmentPlans]);

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
        monthsActive = plan.startedMonthsAgo;
      } else {
        monthsActive = 0;
      }

      total += monthly * monthsActive;
    });

    return total;
  }, [investmentPlans]);

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

  const projectedInvestmentsSummary = useMemo(() => {
    const annualReturn = Math.max(0, expectedAnnualReturn) / 100;
    const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;

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

    let projectedFutureValue = 0;
    let totalProjectedContributions = 0;
    let currentMonthlyContribution = totalMonthlyInvestments;

    for (let m = 0; m < projectionMonths; m++) {
      if (m > 0 && m % 12 === 0) {
        currentMonthlyContribution *= 1 + avgAnnualIncrease;
      }

      projectedFutureValue = (projectedFutureValue + currentMonthlyContribution) * (1 + monthlyReturn);
      totalProjectedContributions += currentMonthlyContribution;
    }

    return {
      avgAnnualIncreasePercent: Math.round(avgAnnualIncrease * 10000) / 100,
      totalProjectedContributions: roundToDecimal(totalProjectedContributions),
      totalProjectedContributionsInclToDate: roundToDecimal(totalProjectedContributions + totalInvestedToDate),
      projectedFutureValue: roundToDecimal(projectedFutureValue + totalInvestedToDate),
    };
  }, [investmentPlans, totalMonthlyInvestments, projectionMonths, expectedAnnualReturn, totalInvestedToDate]);

  const projectionData = useMemo(() => {
    const data: CashFlowProjection[] = [];
    let cumulativeBalance = 0;
    const startDate = new Date();

    const annualReturn = Math.max(0, expectedAnnualReturn) / 100;
    const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;

    let projectedInvestmentValue = totalInvestedToDate;

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

    let cumulativeContributed = totalInvestedToDate;
    let currentMonthlyInvestments = totalMonthlyInvestments;

    for (let i = 0; i < projectionMonths; i++) {
      const monthDate = addMonths(startDate, i);
      const monthKey = format(monthDate, "MMM yyyy");

      if (i > 0 && i % 12 === 0) {
        currentMonthlyInvestments *= 1 + avgAnnualIncrease;
      }

      const monthlyIncome = salary + recurringAmounts.income;
      const monthlyExpenses = averageExpenses + recurringAmounts.expense;

      projectedInvestmentValue = (projectedInvestmentValue + currentMonthlyInvestments) * (1 + monthlyReturn);

      cumulativeContributed += currentMonthlyInvestments;

      const netCashFlow = monthlyIncome - monthlyExpenses - currentMonthlyInvestments;

      cumulativeBalance += netCashFlow;

      data.push({
        month: monthKey,
        income: roundToDecimal(monthlyIncome),
        expenses: roundToDecimal(monthlyExpenses),
        investments: roundToDecimal(currentMonthlyInvestments),
        balance: roundToDecimal(netCashFlow),
        cumulativeBalance: roundToDecimal(cumulativeBalance),
        totalContributed: roundToDecimal(cumulativeContributed),
        totalInvestmentValue: roundToDecimal(projectedInvestmentValue),
      });
    }

    return data;
  }, [salary, averageExpenses, totalMonthlyInvestments, recurringAmounts, projectionMonths, expectedAnnualReturn, investmentPlans, totalInvestedToDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading cash flow data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Cash Flow Projection</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Project your cash flow for the next 12-60 months based on current salary, expenses, and
          investments. Projections include simple monthly compounding on investments using expected
          annual return.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">Projection Period</label>
            <div className="flex gap-2">
              {[12, 24, 36, 48, 60].map((months) => (
                <button
                  key={months}
                  onClick={() => setProjectionMonths(months)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    projectionMonths === months
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  {months}M
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">Options</label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeRecurring}
                onChange={(e) => setIncludeRecurring(e.target.checked)}
                className="rounded border-border text-primary focus:ring-ring"
              />
              <span className="text-sm text-foreground">Include Recurring Transactions</span>
            </label>

            <div className="mt-4">
              <label className="block text-sm text-muted-foreground">Expected annual return (%)</label>
              <input
                type="number"
                value={expectedAnnualReturn}
                onChange={(e) => setExpectedAnnualReturn(Number(e.target.value))}
                className="mt-1 block w-40 rounded-md border border-input bg-card text-foreground text-sm p-2"
                aria-label="Expected annual return percentage"
              />
            </div>
          </div>
        </div>

        {/* Assumptions Display */}
        <div className="mt-6 p-4 bg-secondary rounded-lg">
          <h3 className="text-sm font-semibold text-foreground mb-3">Projection Assumptions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Monthly Salary:</span>
              <span className="font-semibold text-foreground ml-2">{formatCurrency(salary)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Avg. Monthly Expenses:</span>
              <span className="font-semibold text-foreground ml-2">{formatCurrency(averageExpenses)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Monthly Investments:</span>
              <span className="font-semibold text-foreground ml-2">{formatCurrency(totalMonthlyInvestments)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Invested to date:</span>
              <span className="font-semibold text-foreground ml-2">{formatCurrency(totalInvestedToDate)}</span>
            </div>
          </div>

          <div className="mt-4 text-sm text-foreground">
            <div>Projected contribution increase (avg yearly): {projectedInvestmentsSummary.avgAnnualIncreasePercent}%</div>
            <div>Projected contributions over period (new): {formatCurrency(projectedInvestmentsSummary.totalProjectedContributions)}</div>
            <div>Total contributed including past: {formatCurrency(projectedInvestmentsSummary.totalProjectedContributionsInclToDate)}</div>
            <div>Projected investment value (incl. invested to date): {formatCurrency(projectedInvestmentsSummary.projectedFutureValue)}</div>
          </div>
        </div>
      </div>

      {/* Cash Flow Chart */}
      {projectionData.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold text-card-foreground mb-6">Projected Cash Flow</h2>
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
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold text-card-foreground mb-6">Monthly Projection Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Month</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">Income</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">Expenses</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">Investments</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">Net Flow</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">Cumulative</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">Total Contributed</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">Projected Invested Value</th>
                </tr>
              </thead>
              <tbody>
                {projectionData.map((row, index) => (
                  <tr key={index} className="border-b border-border hover:bg-secondary transition-colors">
                    <td className="py-3 px-4 text-sm text-foreground">{row.month}</td>
                    <td className="py-3 px-4 text-sm text-right text-success">{formatCurrency(row.income)}</td>
                    <td className="py-3 px-4 text-sm text-right text-destructive">{formatCurrency(row.expenses)}</td>
                    <td className="py-3 px-4 text-sm text-right text-warning">{formatCurrency(row.investments)}</td>
                    <td className={`py-3 px-4 text-sm text-right font-semibold ${row.balance >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(row.balance)}</td>
                    <td className={`py-3 px-4 text-sm text-right font-semibold ${row.cumulativeBalance >= 0 ? "text-primary" : "text-destructive"}`}>{formatCurrency(row.cumulativeBalance)}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-muted-foreground">{formatCurrency(row.totalContributed || 0)}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-accent-foreground">{formatCurrency(row.projectedInvestmentValue || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recurring Transactions / Diagnostics */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold text-card-foreground mb-4">Cash Flow Diagnostics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-secondary rounded">
            <div className="text-muted-foreground">Recurring Income (monthly)</div>
            <div className="text-lg font-semibold text-foreground">{formatCurrency(recurringAmounts.income)}</div>
          </div>
          <div className="p-4 bg-secondary rounded">
            <div className="text-muted-foreground">Recurring Expense (monthly)</div>
            <div className="text-lg font-semibold text-foreground">{formatCurrency(recurringAmounts.expense)}</div>
          </div>
          <div className="p-4 bg-secondary rounded">
            <div className="text-muted-foreground">Average Expense (monthly)</div>
            <div className="text-lg font-semibold text-foreground">{formatCurrency(averageExpenses)}</div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">Recurring Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 px-3">Title</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                  <th className="py-2 px-3">Type</th>
                </tr>
              </thead>
              <tbody>
                {recurringTransactions.map((rt, idx: number) => {
                  let parsed: { title?: string; amount?: number; type?: string } = { title: "-", amount: 0, type: "expense" };
                  try {
                    parsed = JSON.parse(rt.transactionData);
                  } catch {
                    parsed = { title: rt.title || "-", amount: 0, type: "expense" };
                  }

                  return (
                    <tr key={idx} className="border-t border-border">
                      <td className="py-2 px-3 text-foreground">{parsed.title || rt.title || "Recurring"}</td>
                      <td className="py-2 px-3 text-right text-foreground">{formatCurrency(parsed.amount || 0)}</td>
                      <td className="py-2 px-3 text-foreground">{parsed.type || "expense"}</td>
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
