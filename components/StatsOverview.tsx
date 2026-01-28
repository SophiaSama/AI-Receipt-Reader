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
    <div className="p-6" data-testid="stats-overview">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white tracking-tight uppercase">Capital Flow</h2>
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aggregate Daily Intelligence</p>
        </div>
        <div className="text-right bg-white/[0.03] px-4 py-2 rounded-xl border border-white/5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Liquidity Outflow</p>
          <p className="text-2xl font-black text-primary font-mono tracking-tighter">
            ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={1} />
                <stop offset="100%" stopColor="#FBBF24" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => {
                if (!value) return '';
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }
                const parts = String(value).split(/[-/]/);
                if (parts.length >= 3) {
                  const day = parts[parts.length - 1];
                  const month = parts[parts.length - 2];
                  if (day.length <= 2 && month.length <= 2) {
                    return `${day}/${month}`;
                  }
                }
                return String(value).substring(0, 10);
              }}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)', radius: 8 }}
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
                padding: '12px'
              }}
              labelStyle={{ color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px' }}
              itemStyle={{ color: '#F59E0B', fontWeight: 900, fontSize: '14px', fontFamily: 'monospace' }}
              labelFormatter={(value) => `Log Date: ${value}`}
            />
            <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="url(#barGradient)">
              {dailyData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  className="hover:opacity-80 transition-opacity cursor-crosshair"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};