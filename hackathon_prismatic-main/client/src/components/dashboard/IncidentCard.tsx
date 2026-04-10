// ═══════════════════════════════════════════════════════════
// EIFS — Incident Card Component
// Modern design with accessibility features
// ═══════════════════════════════════════════════════════════

import {
  Car, Flame, Droplets, Building, HeartPulse,
  ShieldAlert, Construction, AlertCircle,
  MapPin, Users, FileText, Clock, Volume2
} from 'lucide-react';
import type { Incident, IncidentType } from '../../lib/types';
import { getSeverityColor, getSeverityLabel, INCIDENT_TYPE_LABELS } from '../../lib/constants';

const INCIDENT_ICONS: Record<IncidentType, React.ReactNode> = {
  road_accident: <Car size={16} strokeWidth={2} />,
  fire: <Flame size={16} strokeWidth={2} />,
  flood: <Droplets size={16} strokeWidth={2} />,
  building_collapse: <Building size={16} strokeWidth={2} />,
  medical: <HeartPulse size={16} strokeWidth={2} />,
  violence: <ShieldAlert size={16} strokeWidth={2} />,
  infrastructure: <Construction size={16} strokeWidth={2} />,
  other: <AlertCircle size={16} strokeWidth={2} />,
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

interface IncidentCardProps {
  incident: Incident;
  compact?: boolean;
  variant?: 'desktop' | 'mobile';
}

export default function IncidentCard({ incident, compact = false }: IncidentCardProps) {
  const severityColor = getSeverityColor(incident.severity_score);
  const severityLabel = getSeverityLabel(incident.severity_score);
  const isCritical = incident.severity_score >= 8;

  if (compact) {
    return (
      <div
        className={`
          p-3 rounded-xl border transition-all duration-200
          ${isCritical ? 'card-critical' : 'hover:border-[var(--border-default)]'}
        `}
        style={{
          background: 'var(--bg-card)',
          borderColor: isCritical ? 'var(--accent-red)' : 'var(--border-subtle)',
        }}
      >
        {/* Type Badge */}
        <div className="flex items-center justify-between mb-2.5">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ backgroundColor: `${severityColor}15`, color: severityColor }}
          >
            {INCIDENT_ICONS[incident.incident_type]}
            <span>{INCIDENT_TYPE_LABELS[incident.incident_type]}</span>
          </div>

          {/* Severity Score */}
          <div
            className={`
              w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
              ${isCritical ? 'animate-pulse' : ''}
            `}
            style={{
              backgroundColor: `${severityColor}20`,
              color: severityColor,
              boxShadow: isCritical ? `0 0 8px ${severityColor}30` : 'none'
            }}
          >
            {incident.severity_score}
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-1.5">
          <MapPin size={12} className="text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[var(--text-primary)] font-medium line-clamp-1">
            {incident.location}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        group relative rounded-xl border p-4 transition-all duration-200
        hover:border-[var(--border-default)] hover:shadow-md
        ${isCritical ? 'card-critical' : 'border-[var(--border-subtle)]'}
      `}
      style={{ background: 'var(--bg-card)' }}
      role="article"
      aria-label={`${INCIDENT_TYPE_LABELS[incident.incident_type]} incident at ${incident.location}`}
    >
      {/* Critical Glow Effect */}
      {isCritical && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${severityColor}08 0%, transparent 50%)`,
          }}
        />
      )}

      {/* Top row: type badge + severity */}
      <div className="flex items-start justify-between mb-3 relative">
        {/* Incident type badge */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: `${severityColor}15`, color: severityColor }}
        >
          {INCIDENT_ICONS[incident.incident_type]}
          <span>{INCIDENT_TYPE_LABELS[incident.incident_type]}</span>
        </div>

        {/* Severity badge */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-[10px] text-[var(--text-tertiary)] uppercase font-semibold tracking-wider">
            {severityLabel}
          </span>
          <div
            className={`
              w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold
              ${isCritical ? 'animate-pulse' : ''}
            `}
            style={{
              backgroundColor: `${severityColor}20`,
              color: severityColor,
              boxShadow: isCritical ? `0 0 12px ${severityColor}40` : 'none'
            }}
          >
            {incident.severity_score}
          </div>
        </div>
      </div>

      {/* Location — LARGER for panic readability */}
      <div className="flex items-start gap-2 mb-2 relative">
        <MapPin size={16} className="mt-0.5 flex-shrink-0" style={{ color: severityColor }} />
        <p className="text-base font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">
          {incident.location}
        </p>
      </div>

      {/* Summary — bigger text, better line height */}
      <p className="text-sm text-[var(--text-secondary)] mb-3 leading-relaxed line-clamp-3">
        {incident.summary}
      </p>

      {/* Critical: Audio Alert + Breathing Prompt */}
      {isCritical && (
        <div className="flex items-center gap-2 mb-3">
          {incident.alert_audio_url && (
            <button
              onClick={() => {
                try {
                  const audio = new Audio(incident.alert_audio_url!);
                  audio.play();
                } catch { /* Non-critical */ }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors"
              style={{
                backgroundColor: 'rgba(255, 100, 100, 0.12)',
                color: 'var(--accent-red)',
              }}
              aria-label="Play voice alert"
            >
              <Volume2 size={14} />
              Voice Alert
            </button>
          )}
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{
              backgroundColor: 'rgba(255, 176, 148, 0.12)',
              color: 'var(--accent-amber)',
            }}
          >
            Breathe in 4s • Hold 4s • Out 4s
          </span>
        </div>
      )}

      {/* Bottom stats row + fusion confidence */}
      <div className="flex items-center gap-4 text-[11px] text-[var(--text-tertiary)] pt-3 border-t border-[var(--border-subtle)] relative">
        <div className="flex items-center gap-1.5">
          <Users size={12} />
          <span>{incident.affected_count.toLocaleString()} affected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText size={12} />
          <span>{incident.report_count} {incident.report_count === 1 ? 'report' : 'reports'}</span>
        </div>
        {/* Fusion confidence indicator */}
        {incident.report_count >= 2 && (
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: incident.report_count >= 3
                ? 'rgba(100, 220, 120, 0.12)'
                : 'rgba(255, 200, 60, 0.12)',
              color: incident.report_count >= 3
                ? 'var(--accent-green)'
                : 'var(--accent-amber)',
            }}
          >
            {incident.report_count >= 3 ? 'Verified' : 'Corroborated'}
          </span>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <Clock size={12} />
          <span>{timeAgo(incident.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}
