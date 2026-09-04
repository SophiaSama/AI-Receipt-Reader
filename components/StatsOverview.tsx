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
  const receiptCount = receipts.length;
  const avgExpense = receiptCount > 0 ? totalSpent / receiptCount : 0;

  if (receipts.length === 0) {
    return (
      <div className="p-4" data-testid="stats-overview">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Analytics Overview</h3>
          <span className="text-[11px] font-medium text-slate-400">Ready for data</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2.5 rounded-xl bg-white/50 border border-pink-100/50">
            <span className="text-[10px] font-medium text-slate-400 block mb-0.5">Total Spent</span>
            <span className="text-sm font-bold text-slate-700" data-testid="total-amount">$0.00</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/50 border border-pink-100/50">
            <span className="text-[10px] font-medium text-slate-400 block mb-0.5">Receipts</span>
            <span className="text-sm font-bold text-slate-700" data-testid="total-receipts">0</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/50 border border-pink-100/50">
            <span className="text-[10px] font-medium text-slate-400 block mb-0.5">Avg / Scan</span>
            <span className="text-sm font-bold text-slate-700">$0.00</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 text-center py-2">
          Upload or log your first receipt to generate spending insights.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4" data-testid="stats-overview">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Financial Summary</h3>
          <p className="text-[11px] text-slate-400">Aggregated spending analytics</p>
        </div>
        <div className="bg-lavender-50 rounded-lg px-2.5 py-1 border border-lavender-100/60">
          <span className="text-[11px] font-semibold text-secondary">
            {receiptCount} {receiptCount === 1 ? 'Record' : 'Records'}
          </span>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="p-2.5 rounded-xl bg-white/70 border border-pink-100/70 shadow-sm">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">Total</span>
          <p className="text-base sm:text-lg font-bold text-slate-800 tracking-tight" data-testid="total-amount">
            ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-white/70 border border-pink-100/70 shadow-sm">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">Scans</span>
          <p className="text-base sm:text-lg font-bold text-slate-800 tracking-tight" data-testid="total-receipts">
            {receiptCount}
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-white/70 border border-pink-100/70 shadow-sm">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">Average</span>
          <p className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
            ${avgExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Spending Trend Bar Chart */}
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E879A0" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#C4B5FD" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#64748B' }}
              axisLine={{ stroke: '#FCE7F3' }}
              tickLine={false}
              tickFormatter={(value) => {
                const d = new Date(value);
                return !isNaN(d.getTime()) ? `${d.getDate()}/${d.getMonth() + 1}` : '';
              }}
              minTickGap={12}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => {
                if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
                return `$${Math.round(value)}`;
              }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(232, 121, 160, 0.08)' }}
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#FFE4E9',
                borderRadius: '12px',
                fontSize: '12px',
                boxShadow: '0 8px 24px rgba(232, 121, 160, 0.15)',
                padding: '8px 12px',
              }}
              labelStyle={{ color: '#475569', fontWeight: 600, marginBottom: '2px' }}
              itemStyle={{ color: '#E879A0', fontWeight: 700 }}
              formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Total']}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="url(#barGradient)" maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};