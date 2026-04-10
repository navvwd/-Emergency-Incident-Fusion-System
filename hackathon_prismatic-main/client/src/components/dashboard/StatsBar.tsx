// ═══════════════════════════════════════════════════════════
// EIFS — Stats Bar Component
// Modern metrics display with mobile optimization
// ═══════════════════════════════════════════════════════════

import { Activity, AlertTriangle, FileText, Users } from 'lucide-react';
import type { Incident } from '../../lib/types';

interface StatsBarProps {
  incidents: Incident[];
  variant?: 'desktop' | 'mobile';
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  trend?: number;
  compact?: boolean;
}

function StatCard({ icon, label, value, color, compact }: StatCardProps) {
  if (compact) {
    return (
      <div
        className="card p-3 flex items-center gap-3 press-effect cursor-pointer"
        style={{ background: 'var(--bg-card)' }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${color}15`,
            color,
            boxShadow: `0 0 16px ${color}10`
          }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold text-[var(--text-primary)] leading-none tracking-tight">
            {value}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="card p-3 flex items-center gap-3 press-effect cursor-pointer"
      style={{ background: 'var(--bg-card)' }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: `${color}15`,
          color,
          boxShadow: `0 0 16px ${color}10`
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-[var(--text-primary)] leading-none tracking-tight">
          {value}
        </p>
        <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider mt-1.5 font-semibold">
          {label}
        </p>
      </div>
    </div>
  );
}

export default function StatsBar({ incidents, variant = 'desktop' }: StatsBarProps) {
  const total = incidents.length;
  const critical = incidents.filter((i) => i.severity_score >= 8).length;
  const totalReports = incidents.reduce((sum, i) => sum + i.report_count, 0);
  const totalAffected = incidents.reduce((sum, i) => sum + i.affected_count, 0);

  const isMobile = variant === 'mobile';

  return (
    <div className={`grid gap-3 ${isMobile ? 'grid-cols-2 p-0' : 'grid-cols-2 lg:grid-cols-4 p-4'}`}>
      <StatCard
        icon={<Activity size={20} strokeWidth={2} />}
        label="Active"
        value={total}
        color="var(--accent-green)"
        compact={isMobile}
      />
      <StatCard
        icon={<AlertTriangle size={20} strokeWidth={2} />}
        label="Critical"
        value={critical}
        color="var(--accent-red)"
        compact={isMobile}
      />
      <StatCard
        icon={<FileText size={20} strokeWidth={2} />}
        label="Reports"
        value={totalReports.toLocaleString()}
        color="var(--accent-amber)"
        compact={isMobile}
      />
      <StatCard
        icon={<Users size={20} strokeWidth={2} />}
        label="Affected"
        value={totalAffected > 1000 ? `${(totalAffected / 1000).toFixed(1)}K` : totalAffected.toLocaleString()}
        color="var(--accent-blue)"
        compact={isMobile}
      />
    </div>
  );
}
