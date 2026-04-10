"use strict";
// ──────────────────────────────────────────────
// EIFS — API Resilience Layer
// Lightweight circuit breaker + retry with backoff.
// No external dependencies. ~60 lines.
// ──────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCircuitOpen = isCircuitOpen;
exports.recordSuccess = recordSuccess;
exports.recordFailure = recordFailure;
exports.getHealthStatus = getHealthStatus;
exports.withRetry = withRetry;
const logger_1 = require("./logger");
const services = {};
const MAX_FAILURES = 3;
const INITIAL_COOLDOWN = 5000;
const MAX_COOLDOWN = 60000;
function isCircuitOpen(serviceName) {
    const state = services[serviceName];
    if (!state?.circuitOpen)
        return false;
    // Cooldown elapsed → half-open (allow one attempt)
    if (Date.now() - state.lastFailure > state.cooldownMs) {
        state.circuitOpen = false;
        return false;
    }
    return true;
}
function recordSuccess(serviceName) {
    services[serviceName] = {
        failures: 0,
        lastFailure: 0,
        circuitOpen: false,
        cooldownMs: INITIAL_COOLDOWN,
    };
}
function recordFailure(serviceName) {
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
        (0, logger_1.logCritical)('CIRCUIT_OPEN', {
            service: serviceName,
            failures: state.failures,
            cooldown_ms: state.cooldownMs,
        });
    }
    services[serviceName] = state;
}
function getHealthStatus() {
    const status = {};
    for (const [name, state] of Object.entries(services)) {
        status[name] = { healthy: !state.circuitOpen, failures: state.failures };
    }
    return status;
}
/**
 * Retry with exponential backoff + jitter.
 * Checks circuit before calling. Respects retry budget.
 */
async function withRetry(fn, serviceName, maxRetries = 1) {
    if (isCircuitOpen(serviceName)) {
        throw new Error(`[${serviceName}] Circuit open — service temporarily unavailable`);
    }
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await fn();
            recordSuccess(serviceName);
            return result;
        }
        catch (error) {
            recordFailure(serviceName);
            if (attempt === maxRetries)
                throw error;
            // Exponential backoff with jitter: ~200ms, ~500ms, ~1200ms
            const delay = Math.min(200 * Math.pow(2.5, attempt) + Math.random() * 100, 5000);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw new Error('Unreachable');
}
//# sourceMappingURL=resilience.js.map