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
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Expense Overview</h2>
          <p className="text-sm text-slate-500">Daily breakdown of your spending</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Total Spent</p>
          <p className="text-2xl font-bold text-emerald-600">${totalSpent.toFixed(2)}</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: '#64748b' }} 
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => {
                if (!value) return '';
                
                const date = new Date(value);
                
                // Check if the date is valid
                if (!isNaN(date.getTime())) {
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }

                // Fallback: If parsing fails, try to extract components manually from YYYY-MM-DD
                const parts = String(value).split(/[-/]/);
                if (parts.length >= 3) {
                  // Assuming YYYY-MM-DD or DD-MM-YYYY format
                  const day = parts[parts.length - 1];
                  const month = parts[parts.length - 2];
                  if (day.length <= 2 && month.length <= 2) {
                    return `${day}/${month}`;
                  }
                }

                // Final fallback: Return truncated string
                return String(value).substring(0, 10);
              }}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#64748b' }} 
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              cursor={{ fill: '#f1f5f9' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              labelFormatter={(value) => `Date: ${value}`}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {dailyData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#3b82f6" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};