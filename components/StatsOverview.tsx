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
    <div className="p-8" data-testid="stats-overview">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold text-foreground tracking-tight uppercase">Capital Streams</h2>
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
          </div>
          <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Aggregate Daily Indices</p>
        </div>
        <div className="text-right bg-black/20 px-5 py-3 rounded-2xl border border-white/5 shadow-inner">
          <p className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-[0.15em] mb-1.5" data-testid="total-receipts">Nodes: {receipts.length}</p>
          <p className="text-3xl font-black text-foreground font-mono tracking-tighter" data-testid="total-amount">
            <span className="text-accent mr-1">$</span>{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity={1} />
                <stop offset="100%" stopColor="#2563EB" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: '#475569', fontWeight: 700, fontFamily: 'monospace' }}
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
              tick={{ fontSize: 9, fill: '#475569', fontWeight: 700, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.03)', radius: 12 }}
              contentStyle={{
                backgroundColor: 'rgba(2, 6, 23, 0.95)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.8)',
                padding: '16px'
              }}
              labelStyle={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', fontSize: '9px', marginBottom: '8px', letterSpacing: '0.1em' }}
              itemStyle={{ color: '#FFFFFF', fontWeight: 900, fontSize: '15px', fontFamily: 'monospace' }}
              labelFormatter={(value) => `Commit Date: ${value}`}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Aggregate']}
            />
            <Bar dataKey="total" radius={[8, 8, 2, 2]} fill="url(#barGradient)">
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