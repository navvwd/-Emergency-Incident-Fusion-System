// ──────────────────────────────────────────────
// EIFS — Realtime Incidents Hook
// Fetches initial data + subscribes to Supabase Realtime
// ──────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import type { Incident } from '../lib/types';

export function useRealtimeIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // ── 1. Fetch initial incidents ───────────
    async function fetchIncidents() {
      try {
        const { data } = await api.get<Incident[]>('/api/incidents');
        setIncidents(data || []);
      } catch (err) {
        console.error('[Realtime] Failed to fetch initial incidents:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchIncidents();

    // ── 2. Subscribe to Realtime changes ─────
    try {
      const channel = supabase
        .channel('incidents-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'incidents' },
          (payload) => {
            console.log('[Realtime] New incident:', payload.new);
            const newIncident = payload.new as Incident;
            setIncidents((prev) => [newIncident, ...prev]);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'incidents' },
          (payload) => {
            console.log('[Realtime] Incident updated:', payload.new);
            const updated = payload.new as Incident;
            setIncidents((prev) =>
              prev.map((inc) => (inc.id === updated.id ? updated : inc))
            );
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Subscription status:', status);
        });

      channelRef.current = channel;
    } catch (err) {
      console.error('[Realtime] Failed to subscribe:', err);
    }

    // ── 3. Cleanup ───────────────────────────
    return () => {
      try {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }
      } catch (err) {
        console.warn('[Realtime] Cleanup error:', err);
      }
    };
  }, []);

  return { incidents, loading };
}
