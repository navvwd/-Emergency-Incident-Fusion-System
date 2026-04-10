// ═══════════════════════════════════════════════════════════
// EIFS — MetricsPanel Component
// Shows pipeline health, service status, and recent critical events.
// Fetches from /health endpoint. Follows AI-01 Sentinel design.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Shield, Clock, Zap, Server } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ServiceHealth {
  healthy: boolean;
  failures: number;
}

interface CriticalEvent {
  level: 'CRITICAL';
  event: string;
  timestamp: string;
  details: Record<string, any>;
}

interface HealthResponse {
  status: string;
  service: string;
  services: Record<string, ServiceHealth>;
  recent_critical_count: number;
  critical_events: CriticalEvent[];
  uptime: number;
  timestamp: string;
}

export default function MetricsPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();
      setHealth(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="card p-4" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-2">
          <Activity size={16} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
          <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
            Loading system metrics...
          </span>
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="card p-4" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} style={{ color: 'var(--accent-red)' }} />
          <span className="text-xs text-[var(--accent-red)] uppercase tracking-wider font-semibold">
            Health check failed: {error || 'No data'}
          </span>
        </div>
      </div>
    );
  }

  const isHealthy = health.status === 'healthy';
  const serviceEntries = Object.entries(health.services);
  const uptimeMin = Math.floor(health.uptime / 60);

  return (
    <div className="card p-4 space-y-4" style={{ background: 'var(--bg-card)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: isHealthy ? 'rgba(100, 220, 120, 0.12)' : 'rgba(255, 100, 100, 0.12)',
            }}
          >
            <Shield size={16} style={{ color: isHealthy ? 'var(--accent-green)' : 'var(--accent-red)' }} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              System Health
            </h3>
            <p className="text-[10px] text-[var(--text-secondary)] tracking-wide">
              Uptime {uptimeMin}m • {health.recent_critical_count} critical events
            </p>
          </div>
        </div>
        <div
          className="px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest"
          style={{
            backgroundColor: isHealthy ? 'rgba(100, 220, 120, 0.15)' : 'rgba(255, 100, 100, 0.15)',
            color: isHealthy ? 'var(--accent-green)' : 'var(--accent-red)',
          }}
        >
          {health.status}
        </div>
      </div>

      {/* Service Status Grid */}
      {serviceEntries.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {serviceEntries.map(([name, svc]) => (
            <div
              key={name}
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                backgroundColor: svc.healthy
                  ? 'rgba(100, 220, 120, 0.06)'
                  : 'rgba(255, 100, 100, 0.08)',
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: svc.healthy ? 'var(--accent-green)' : 'var(--accent-red)',
                  boxShadow: svc.healthy
                    ? '0 0 6px rgba(100, 220, 120, 0.5)'
                    : '0 0 6px rgba(255, 100, 100, 0.5)',
                }}
              />
              <span className="text-[10px] font-semibold text-[var(--text-primary)] truncate">
                {name.replace(/-/g, ' ')}
              </span>
              {svc.failures > 0 && (
                <span className="text-[9px] font-bold ml-auto" style={{ color: 'var(--accent-amber)' }}>
                  {svc.failures}×
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recent Critical Events */}
      {health.critical_events.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Zap size={12} style={{ color: 'var(--accent-red)' }} />
            <span className="text-[10px] font-bold text-[var(--accent-red)] uppercase tracking-widest">
              Critical Events
            </span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
            {health.critical_events.slice(0, 5).map((evt, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-[10px]"
                style={{ backgroundColor: 'rgba(255, 100, 100, 0.06)' }}
              >
                <Clock size={10} style={{ color: 'var(--text-secondary)' }} />
                <span className="font-semibold" style={{ color: 'var(--accent-red)' }}>
                  {evt.event.replace(/_/g, ' ')}
                </span>
                <span className="text-[var(--text-secondary)] ml-auto whitespace-nowrap">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Critical Events */}
      {health.critical_events.length === 0 && serviceEntries.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(100, 220, 120, 0.06)' }}>
          <Server size={14} style={{ color: 'var(--accent-green)' }} />
          <span className="text-[11px] text-[var(--accent-green)] font-semibold">
            All systems nominal — no events in the last 5 minutes
          </span>
        </div>
      )}
    </div>
  );
}
