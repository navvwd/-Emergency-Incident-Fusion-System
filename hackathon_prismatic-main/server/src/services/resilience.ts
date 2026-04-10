// ──────────────────────────────────────────────
// EIFS — API Resilience Layer
// Lightweight circuit breaker + retry with backoff.
// No external dependencies. ~60 lines.
// ──────────────────────────────────────────────

import { logCritical } from './logger';

interface ServiceState {
  failures: number;
  lastFailure: number;
  circuitOpen: boolean;
  cooldownMs: number;
}

const services: Record<string, ServiceState> = {};
const MAX_FAILURES = 3;
const INITIAL_COOLDOWN = 5000;
const MAX_COOLDOWN = 60000;

export function isCircuitOpen(serviceName: string): boolean {
  const state = services[serviceName];
  if (!state?.circuitOpen) return false;

  // Cooldown elapsed → half-open (allow one attempt)
  if (Date.now() - state.lastFailure > state.cooldownMs) {
    state.circuitOpen = false;
    return false;
  }
  return true;
}

export function recordSuccess(serviceName: string): void {
  services[serviceName] = {
    failures: 0,
    lastFailure: 0,
    circuitOpen: false,
    cooldownMs: INITIAL_COOLDOWN,
  };
}

export function recordFailure(serviceName: string): void {
  const state = services[serviceName] || {
    failures: 0,
    lastFailure: 0,
    circuitOpen: false,
    cooldownMs: INITIAL_COOLDOWN,
  };

  state.failures++;
  state.lastFailure = Date.now();

  if (state.failures >= MAX_FAILURES) {
    state.circuitOpen = true;
    state.cooldownMs = Math.min(state.cooldownMs * 2, MAX_COOLDOWN);
    logCritical('CIRCUIT_OPEN', {
      service: serviceName,
      failures: state.failures,
      cooldown_ms: state.cooldownMs,
    });
  }

  services[serviceName] = state;
}

export function getHealthStatus(): Record<string, { healthy: boolean; failures: number }> {
  const status: Record<string, { healthy: boolean; failures: number }> = {};
  for (const [name, state] of Object.entries(services)) {
    status[name] = { healthy: !state.circuitOpen, failures: state.failures };
  }
  return status;
}

/**
 * Retry with exponential backoff + jitter.
 * Checks circuit before calling. Respects retry budget.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  serviceName: string,
  maxRetries: number = 1,
): Promise<T> {
  if (isCircuitOpen(serviceName)) {
    throw new Error(`[${serviceName}] Circuit open — service temporarily unavailable`);
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      recordSuccess(serviceName);
      return result;
    } catch (error) {
      recordFailure(serviceName);
      if (attempt === maxRetries) throw error;
      // Exponential backoff with jitter: ~200ms, ~500ms, ~1200ms
      const delay = Math.min(200 * Math.pow(2.5, attempt) + Math.random() * 100, 5000);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw new Error('Unreachable');
}
