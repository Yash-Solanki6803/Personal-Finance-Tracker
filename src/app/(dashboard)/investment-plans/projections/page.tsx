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
  Area,
  AreaChart,
} from "recharts";

interface InvestmentPlan {
  id: string;
  name: string;
  monthlyContribution: number;
  expectedReturnMin: number;
  expectedReturnMax: number;
  compoundingFrequency: string;
  annualIncreasePercent: number;
  startDate: string;
  status: string;
}

interface ProjectionDataPoint {
  year: number;
  invested: number;
  value: number;
  valueMin?: number;
  valueMax?: number;
  interest: number;
  interestMin?: number;
  interestMax?: number;
}

function InvestmentProjectionsContent() {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [timeHorizon, setTimeHorizon] = useState<number>(10);
  const [customYears, setCustomYears] = useState<number>(10);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/investment-plans?status=active");
        if (!res.ok) throw new Error("Failed to fetch investment plans");
        const data = await res.json();
        if (data.success) {
          const list = Array.isArray(data.data) ? data.data : [];
          setPlans(list.filter((p: InvestmentPlan) => p.status === "active"));
          // Auto-select all plans by default
          if (list.length > 0) {
            setSelectedPlanIds(list.map((p: InvestmentPlan) => p.id));
          }
        }
      } catch (err) {
        console.error("Failed to fetch plans", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // Helper function to calculate SIP projection
  const calculateSIPProjection = (
    monthlyContribution: number,
    annualReturnMin: number,
    annualReturnMax: number,
    years: number,
    annualIncreasePercent: number,
    compoundingFrequency: string
  ) => {
    const months = years * 12;
    const monthlyReturnMin = annualReturnMin / 100 / 12;
    const monthlyReturnMax = annualReturnMax / 100 / 12;

    const calculateProjection = (monthlyReturn: number) => {
      const result = [];
      let balance = 0;
      let totalInvested = 0;
      let currentMonthlyContribution = monthlyContribution;

      for (let month = 1; month <= months; month++) {
        // Apply annual increase every 12 months
        if (month > 1 && (month - 1) % 12 === 0) {
          currentMonthlyContribution *= 1 + annualIncreasePercent / 100;
        }

        // Add monthly contribution
        balance += currentMonthlyContribution;
        totalInvested += currentMonthlyContribution;

        // Apply monthly interest
        balance *= 1 + monthlyReturn;

        // Record year-end data
        if (month % 12 === 0) {
          const year = month / 12;
          const interest = balance - totalInvested;

          result.push({
            year,
            invested: roundToDecimal(totalInvested),
            value: roundToDecimal(balance),
            interest: roundToDecimal(interest),
          });
        }
      }

      return result;
    };

    return {
      projectionMin: calculateProjection(monthlyReturnMin),
      projectionMax: calculateProjection(monthlyReturnMax),
    };
  };

  // Calculate projections for selected plans
  const projectionData = useMemo(() => {
    if (selectedPlanIds.length === 0) return [];

    const selectedPlans = plans.filter((p) => selectedPlanIds.includes(p.id));
    if (selectedPlans.length === 0) return [];

    // Aggregate data by year
    const yearData: Record<number, ProjectionDataPoint> = {};

    selectedPlans.forEach((plan) => {
      const { projectionMin, projectionMax } = calculateSIPProjection(
        plan.monthlyContribution,
        plan.expectedReturnMin || 0,
        plan.expectedReturnMax || plan.expectedReturnMin || 0,
        timeHorizon,
        plan.annualIncreasePercent || 0,
        plan.compoundingFrequency || "monthly"
      );

      projectionMin.forEach((point, index) => {
        const year = point.year;
        if (!yearData[year]) {
          yearData[year] = {
            year,
            invested: 0,
            value: 0,
            interest: 0,
          };
        }

        yearData[year].invested += point.invested;
        yearData[year].interest += point.interest;

        // For single plan or when min === max, use single value
        if (plan.expectedReturnMin === plan.expectedReturnMax) {
          yearData[year].value += point.value;
        } else {
          // For range, track min and max separately
          const maxPoint = projectionMax[index];
          if (!yearData[year].valueMin) yearData[year].valueMin = 0;
          if (!yearData[year].valueMax) yearData[year].valueMax = 0;
          if (!yearData[year].interestMin) yearData[year].interestMin = 0;
          if (!yearData[year].interestMax) yearData[year].interestMax = 0;

          yearData[year].valueMin! += point.value;
          yearData[year].valueMax! += maxPoint.value;
          yearData[year].interestMin! += point.interest;
          yearData[year].interestMax! += maxPoint.interest;
          yearData[year].value = (yearData[year].valueMin! + yearData[year].valueMax!) / 2;
        }
      });
    });

    return Object.values(yearData).sort((a, b) => a.year - b.year);
  }, [selectedPlanIds, plans, timeHorizon]);

  const hasRange = projectionData.some(
    (d) => d.valueMin !== undefined && d.valueMax !== undefined
  );

  const handleSelectAll = () => {
    setSelectedPlanIds(plans.map((p) => p.id));
  };

  const handleDeselectAll = () => {
    setSelectedPlanIds([]);
  };

  const togglePlan = (planId: string) => {
    setSelectedPlanIds((prev) =>
      prev.includes(planId)
        ? prev.filter((id) => id !== planId)
        : [...prev, planId]
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">
            Year {payload[0].payload.year}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          {payload[0].payload.valueMin && payload[0].payload.valueMax && (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Range: {formatCurrency(payload[0].payload.valueMin)} -{" "}
                {formatCurrency(payload[0].payload.valueMax)}
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading projections...</div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          No active investment plans found. Create a plan to see projections.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Investment Projections
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Visualize your investment growth over time with interactive charts.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Select Investment Plans
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg p-3">
              {plans.map((plan) => (
                <label
                  key={plan.id}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlanIds.includes(plan.id)}
                    onChange={() => togglePlan(plan.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">
                    {plan.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({formatCurrency(plan.monthlyContribution)}/mo)
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSelectAll}
                className="text-xs px-3 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="text-xs px-3 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Time Horizon */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Time Horizon
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                {[5, 10, 20].map((years) => (
                  <button
                    key={years}
                    onClick={() => setTimeHorizon(years)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      timeHorizon === years
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {years} Years
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Custom:
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={customYears}
                  onChange={(e) => {
                    const years = parseInt(e.target.value);
                    if (years >= 1 && years <= 50) {
                      setCustomYears(years);
                      setTimeHorizon(years);
                    }
                  }}
                  className="w-20 px-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg text-sm"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">years</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {selectedPlanIds.length > 0 && projectionData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Projection Chart
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            {hasRange ? (
              <AreaChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="year"
                  stroke="#6b7280"
                  label={{ value: "Year", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  stroke="#6b7280"
                  tickFormatter={(value) => formatCurrency(value)}
                  label={{
                    value: "Amount",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="valueMin"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  name="Projected Value (Min)"
                />
                <Area
                  type="monotone"
                  dataKey="valueMax"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.2}
                  name="Projected Value (Max)"
                />
                <Line
                  type="monotone"
                  dataKey="invested"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Total Invested"
                />
              </AreaChart>
            ) : (
              <LineChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="year"
                  stroke="#6b7280"
                  label={{ value: "Year", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  stroke="#6b7280"
                  tickFormatter={(value) => formatCurrency(value)}
                  label={{
                    value: "Amount",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Projected Value"
                />
                <Line
                  type="monotone"
                  dataKey="invested"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Total Invested"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Year-wise Breakdown Table */}
      {selectedPlanIds.length > 0 && projectionData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Year-wise Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Year
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Contribution
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Interest Earned
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {projectionData.map((row) => (
                  <tr
                    key={row.year}
                    className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {row.year}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">
                      {formatCurrency(row.invested)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">
                      {row.interestMin && row.interestMax ? (
                        <span>
                          {formatCurrency(row.interestMin)} -{" "}
                          {formatCurrency(row.interestMax)}
                        </span>
                      ) : (
                        formatCurrency(row.interest)
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900 dark:text-white">
                      {row.valueMin && row.valueMax ? (
                        <span>
                          {formatCurrency(row.valueMin)} -{" "}
                          {formatCurrency(row.valueMax)}
                        </span>
                      ) : (
                        formatCurrency(row.value)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedPlanIds.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Select at least one investment plan to view projections.
          </p>
        </div>
      )}
    </div>
  );
}

export default function InvestmentProjectionsPage() {
  return (
    <ProtectedPage>
      <InvestmentProjectionsContent />
    </ProtectedPage>
  );
}

