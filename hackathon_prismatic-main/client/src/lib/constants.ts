// ──────────────────────────────────────────────
// EIFS — Frontend Constants
// Based on PROJECT.md Section 11
// ──────────────────────────────────────────────

import type { IncidentType } from './types';

// ─── Severity Color Map ──────────────────────

export const SEVERITY_COLORS: Record<string, string> = {
  low: '#22C55E',       // 1-3
  medium: '#F59E0B',    // 4-6
  high: '#F97316',      // 7-8
  critical: '#EF4444',  // 9-10
};

/**
 * Returns the appropriate color hex for a given severity score (1-10).
 */
export function getSeverityColor(score: number): string {
  if (score >= 9) return SEVERITY_COLORS.critical;
  if (score >= 7) return SEVERITY_COLORS.high;
  if (score >= 4) return SEVERITY_COLORS.medium;
  return SEVERITY_COLORS.low;
}

/**
 * Returns a human-readable severity label.
 */
export function getSeverityLabel(score: number): string {
  if (score >= 9) return 'Critical';
  if (score >= 7) return 'High';
  if (score >= 4) return 'Medium';
  return 'Low';
}

// ─── Incident Type Labels ────────────────────

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  road_accident: 'Road Accident',
  fire: 'Fire',
  flood: 'Flood',
  building_collapse: 'Building Collapse',
  medical: 'Medical Emergency',
  violence: 'Violence',
  infrastructure: 'Infrastructure',
  other: 'Other',
};

// ─── Incident Type Icons (lucide icon names) ─

export const INCIDENT_TYPE_ICONS: Record<IncidentType, string> = {
  road_accident: 'car',
  fire: 'flame',
  flood: 'droplets',
  building_collapse: 'building',
  medical: 'heart-pulse',
  violence: 'shield-alert',
  infrastructure: 'construction',
  other: 'alert-circle',
};

// ─── Map Configuration ───────────────────────

export const MAP_CONFIG = {
  center: [13.0827, 80.2707] as [number, number], // Chennai
  zoom: 12,
  tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  tileAttribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
};

// ─── Theme Colors (from Section 11) ──────────

export const THEME = {
  background: '#0A0A0B',
  cardBg: '#111113',
  cardBorder: '#1E1E22',
  accent: '#EF4444',
  accentAmber: '#F59E0B',
  accentGreen: '#22C55E',
  textPrimary: '#F5F5F5',
  textSecondary: '#9CA3AF',
} as const;
