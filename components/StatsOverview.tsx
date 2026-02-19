import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ReceiptData, DailyTotal } from '../types';

interface StatsOverviewProps {
  receipts: ReceiptData[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ receipts }) => {
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();

    receipts.forEach(r => {
      // Use the raw date string as the aggregation key
      const date = r.date;
      const current = map.get(date) || 0;
      map.set(date, current + r.total);
    });

    const data: DailyTotal[] = Array.from(map.entries())
      .map(([date, total]) => ({ date, total, count: 0 }))
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        // Handle invalid dates in sorting by falling back to string comparison
        if (isNaN(timeA) || isNaN(timeB)) return a.date.localeCompare(b.date);
        return timeA - timeB;
      });

    return data;
  }, [receipts]);

  const totalSpent = useMemo(() => receipts.reduce((acc, curr) => acc + curr.total, 0), [receipts]);

  if (receipts.length === 0) {
    return null;
  }

  return (
    <div className="p-3" data-testid="stats-overview">
      <div className="flex justify-between items-end mb-3">
        <div>
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">Total Expenses</h3>
          <p className="text-2xl font-semibold text-slate-800 tracking-tight">
            ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-lavender-50 rounded-lg px-2 py-0.5">
          <span className="text-[10px] font-mono text-secondary">Last 30 Days</span>
        </div>
      </div>

      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E879A0" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#C4B5FD" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => {
                const d = new Date(value);
                return !isNaN(d.getTime()) ? `${d.getDate()}/${d.getMonth() + 1}` : '';
              }}
              minTickGap={10}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value / 1000}k`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(232, 121, 160, 0.06)' }}
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#FFE4E9',
                borderRadius: '8px',
                fontSize: '11px',
                boxShadow: '0 4px 12px rgba(232, 121, 160, 0.1)',
              }}
              labelStyle={{ color: '#64748b' }}
              itemStyle={{ color: '#E879A0' }}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="url(#barGradient)" maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};