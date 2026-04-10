// ═══════════════════════════════════════════════════════════
// EIFS — Incident Feed Component
// Modern design with enhanced loading states and accessibility
// ═══════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { Radio, AlertCircle } from 'lucide-react';
import type { Incident } from '../../lib/types';
import IncidentCard from './IncidentCard';

interface IncidentFeedProps {
  incidents: Incident[];
  loading: boolean;
  variant?: 'desktop' | 'mobile';
}

function SkeletonCard() {
  return (
    <div
      className="rounded-xl border border-[var(--border-subtle)] p-4"
      style={{ background: 'var(--bg-card)' }}
    >
      <div className="flex justify-between mb-3">
        <div className="h-6 w-24 bg-[var(--bg-tertiary)] rounded-full animate-shimmer" />
        <div className="h-8 w-8 bg-[var(--bg-tertiary)] rounded-lg animate-shimmer" />
      </div>
      <div className="h-4 w-3/4 bg-[var(--bg-tertiary)] rounded mb-2 animate-shimmer" />
      <div className="h-3 w-full bg-[var(--bg-tertiary)] rounded mb-3 animate-shimmer" />
      <div className="flex gap-4 pt-3 border-t border-[var(--border-subtle)]">
        <div className="h-3 w-20 bg-[var(--bg-tertiary)] rounded animate-shimmer" />
        <div className="h-3 w-16 bg-[var(--bg-tertiary)] rounded animate-shimmer" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] py-12 px-6">
      <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4 shadow-inner">
        <Radio size={28} className="opacity-40" />
      </div>
      <p className="text-base font-semibold text-[var(--text-primary)]">No active incidents</p>
      <p className="text-sm mt-1 text-[var(--text-tertiary)]">Submit a report to get started</p>
    </div>
  );
}

export default function IncidentFeed({ incidents, loading, variant = 'desktop' }: IncidentFeedProps) {
  // Sort: severity DESC, then updated_at DESC
  const sorted = useMemo(() => {
    return [...incidents].sort((a, b) => {
      if (b.severity_score !== a.severity_score) {
        return b.severity_score - a.severity_score;
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [incidents]);

  const criticalCount = incidents.filter(i => i.severity_score >= 8).length;
  const isMobile = variant === 'mobile';

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-green-subtle)] flex items-center justify-center">
              <Radio size={18} className="text-[var(--accent-green)]" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[var(--accent-green)] rounded-full border-2 border-[var(--bg-secondary)] animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide">
              Live Feed
            </h2>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Real-time updates
            </p>
          </div>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-2 ml-auto">
          {criticalCount > 0 && (
            <span className="badge badge-red animate-pulse">
              <AlertCircle size={12} />
              {criticalCount} Critical
            </span>
          )}
          <span className="badge bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            {incidents.length}
          </span>
        </div>
      </div>

      {/* Scrollable list */}
      <div
        className={`flex-1 overflow-y-auto custom-scrollbar ${isMobile ? 'hide-scrollbar-mobile' : ''}`}
        role="feed"
        aria-label="Incident feed"
        aria-busy={loading}
      >
        {loading ? (
          // Skeleton loaders
          <div className="p-3 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ animationDelay: `${i * 100}ms` }}>
                <SkeletonCard />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="p-3 space-y-3">
            {sorted.map((incident, index) => (
              <div
                key={incident.id}
                className="animate-slideInUp"
                style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
              >
                <IncidentCard incident={incident} variant={variant} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
