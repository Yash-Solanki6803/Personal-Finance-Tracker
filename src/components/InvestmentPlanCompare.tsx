"use client";

import { useEffect, useState } from "react";
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
import { formatCurrency } from "@/lib/utils";

interface ProjectionPoint { month: string; value: number; }

export default function InvestmentPlanCompare({ left, right }: { left: any; right: any }) {
  const [data, setData] = useState<Array<any>>([]);

  useEffect(() => {
    // both left and right should contain a `projection` array of { month, value }
    const leftProj: ProjectionPoint[] = left?.projection || [];
    const rightProj: ProjectionPoint[] = right?.projection || [];

    const map = new Map<string, any>();
    leftProj.forEach((p) => {
      map.set(p.month, { month: p.month, left: p.value, right: 0 });
    });
    rightProj.forEach((p) => {
      const existing = map.get(p.month);
      if (existing) existing.right = p.value;
      else map.set(p.month, { month: p.month, left: 0, right: p.value });
    });

    const arr = Array.from(map.values()).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    setData(arr);
  }, [left, right]);

  return (
    <div className="space-y-4">
      <div className="h-64 bg-white dark:bg-slate-900 rounded-lg border p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(v) => formatCurrency(v)} />
            <Tooltip formatter={(v:any) => formatCurrency(v as number)} />
            <Legend />
            <Line type="monotone" dataKey="left" name={left?.name || 'Plan A'} stroke="#3b82f6" dot={false} />
            <Line type="monotone" dataKey="right" name={right?.name || 'Plan B'} stroke="#10b981" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border p-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Month</th>
              <th className="text-right">{left?.name || 'Plan A'}</th>
              <th className="text-right">{right?.name || 'Plan B'}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.month} className="border-t">
                <td>{row.month}</td>
                <td className="text-right">{formatCurrency(row.left || 0)}</td>
                <td className="text-right">{formatCurrency(row.right || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
