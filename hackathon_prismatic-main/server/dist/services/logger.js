"use strict";
// ──────────────────────────────────────────────
// EIFS — Structured Critical Event Logger
// Machine-readable JSON logs for critical system events.
// Ring buffer of last 100 events for /health endpoint.
// ──────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.logCritical = logCritical;
exports.getRecentCriticalEvents = getRecentCriticalEvents;
exports.getAllCriticalEvents = getAllCriticalEvents;
// In-memory ring buffer of last 100 critical events
const criticalEvents = [];
const MAX_EVENTS = 100;
function logCritical(event, details) {
    const entry = {
        level: 'CRITICAL',
        event,
        timestamp: new Date().toISOString(),
        details,
    };
    // Structured log — grep-able, parseable by any log aggregator
    console.error(JSON.stringify(entry));
    criticalEvents.push(entry);
    if (criticalEvents.length > MAX_EVENTS)
        criticalEvents.shift();
}
function getRecentCriticalEvents(windowMs = 5 * 60 * 1000) {
    const cutoff = Date.now() - windowMs;
    return criticalEvents.filter(e => new Date(e.timestamp).getTime() > cutoff);
}
function getAllCriticalEvents() {
    return [...criticalEvents];
}
//# sourceMappingURL=logger.js.map