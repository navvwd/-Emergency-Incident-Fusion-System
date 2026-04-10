// ──────────────────────────────────────────────
// EIFS — Structured Critical Event Logger
// Machine-readable JSON logs for critical system events.
// Ring buffer of last 100 events for /health endpoint.
// ──────────────────────────────────────────────

export type CriticalEvent =
  | 'FUSION_FAILED'
  | 'FUSION_DISABLED'
  | 'PIPELINE_TIMEOUT'
  | 'CIRCUIT_OPEN'
  | 'STT_FAILED'
  | 'VISION_BOTH_FAILED'
  | 'EMBEDDING_FAILED';

export interface CriticalLogEntry {
  level: 'CRITICAL';
  event: CriticalEvent;
  timestamp: string;
  details: Record<string, any>;
}

// In-memory ring buffer of last 100 critical events
const criticalEvents: CriticalLogEntry[] = [];
const MAX_EVENTS = 100;

export function logCritical(event: CriticalEvent, details: Record<string, any>): void {
  const entry: CriticalLogEntry = {
    level: 'CRITICAL',
    event,
    timestamp: new Date().toISOString(),
    details,
  };

  // Structured log — grep-able, parseable by any log aggregator
  console.error(JSON.stringify(entry));

  criticalEvents.push(entry);
  if (criticalEvents.length > MAX_EVENTS) criticalEvents.shift();
}

export function getRecentCriticalEvents(windowMs: number = 5 * 60 * 1000): CriticalLogEntry[] {
  const cutoff = Date.now() - windowMs;
  return criticalEvents.filter(e => new Date(e.timestamp).getTime() > cutoff);
}

export function getAllCriticalEvents(): CriticalLogEntry[] {
  return [...criticalEvents];
}
