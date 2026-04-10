// ═══════════════════════════════════════════════════════════
// EIFS — Severity Distribution Chart
// Modern bar chart with gradient effects
// ═══════════════════════════════════════════════════════════

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid
} from 'recharts';
import type { Incident } from '../../lib/types';
import { getSeverityColor } from '../../lib/constants';

interface SeverityChartProps {
  incidents: Incident[];
}

export default function SeverityChart({ incidents }: SeverityChartProps) {
  const data = useMemo(() => {
    let low = 0;
    let med = 0;
    let high = 0;
    let crit = 0;

    incidents.forEach((inc) => {
      const s = inc.severity_score;
      if (s <= 3) low++;
      else if (s <= 6) med++;
      else if (s <= 8) high++;
      else crit++;
    });

    return [
      { name: 'Low', count: low, color: getSeverityColor(2), key: 'low' },
      { name: 'Med', count: med, color: getSeverityColor(5), key: 'medium' },
      { name: 'High', count: high, color: getSeverityColor(7), key: 'high' },
      { name: 'Crit', count: crit, color: getSeverityColor(9), key: 'critical' },
    ];
  }, [incidents]);

  const total = incidents.length;

  // Don't render empty chart if no data
  if (total === 0) {
    return (
      <div className="h-40 w-full flex flex-col items-center justify-center text-[var(--text-muted)]"
        role="img"
        aria-label="No severity data available"
      >
        <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-2"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[var(--text-tertiary)]"
          >
            <rect x="3" y="12" width="4" height="8" rx="1" fill="currentColor" opacity="0.3" />
            <rect x="10" y="8" width="4" height="12" rx="1" fill="currentColor" opacity="0.5" />
            <rect x="17" y="4" width="4" height="16" rx="1" fill="currentColor" opacity="0.3" />
          </svg>
        </div>
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  return (
    <div className="h-44 w-full px-2"
      role="img"
      aria-label="Severity distribution chart showing low, medium, high, and critical incident counts"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          barSize={32}
        >
          <defs>
            {data.map((entry, index) => (
              <linearGradient key={`gradient-${index}`} id={`gradient-${entry.key}`} x1="0" y1="0" x2="0" y2="1"
              >
                <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                <stop offset="100%" stopColor={entry.color} stopOpacity={0.6} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-subtle)"
            vertical={false}
            opacity={0.5}
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: 500
            }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fill: 'var(--text-tertiary)',
              fontSize: 10
            }}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.4 }}
            contentStyle={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '10px 14px',
              boxShadow: 'var(--shadow-lg)'
            }}
            itemStyle={{
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600
            }}
            labelStyle={{
              color: 'var(--text-secondary)',
              fontSize: '11px',
              marginBottom: '6px',
              fontWeight: 500
            }}
            formatter={(value: number, _name: string, props: any) => {
              const percentage = total > 0 ? ((value as number / total) * 100).toFixed(0) : '0';
              return [`${value} incidents (${percentage}%)`, props.payload.name];
            }}
          />
          <Bar
            dataKey="count"
            radius={[8, 8, 0, 0]}
            animationDuration={600}
            animationBegin={100}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`url(#gradient-${entry.key})`}
                style={{
                  filter: entry.count > 0 ? `drop-shadow(0 4px 8px ${entry.color}35)` : 'none'
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
