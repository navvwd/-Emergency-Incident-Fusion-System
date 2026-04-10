// ═══════════════════════════════════════════════════════════
// EIFS — Interactive Incident Map
// Modern Leaflet map with enhanced controls and accessibility
// ═══════════════════════════════════════════════════════════

import { useCallback, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Plus, Minus, Locate, Radio } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type { Incident } from '../../lib/types';
import { getSeverityColor, MAP_CONFIG } from '../../lib/constants';
import IncidentCard from './IncidentCard';

// Map Controls Component
function MapControls() {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  const handleLocate = useCallback(() => {
    if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.flyTo([latitude, longitude], 14, { duration: 1.2 });
          setLocating(false);
        },
        () => {
          // Fallback to Chennai center
          map.flyTo(MAP_CONFIG.center, 12, { duration: 1 });
          setLocating(false);
        },
        { timeout: 10000 }
      );
    }
  }, [map]);

  return (
    <div className="absolute bottom-4 right-4 z-[var(--z-dropdown)] flex flex-col gap-2">
      {/* Zoom Controls */}
      <div className="glass rounded-xl overflow-hidden shadow-lg border border-[var(--border-subtle)]">
        <button
          onClick={() => map.zoomIn()}
          className="w-11 h-11 flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors touch-target focus-ring"
          aria-label="Zoom in"
        >
          <Plus size={20} strokeWidth={2} />
        </button>
        <div className="h-px bg-[var(--border-subtle)]" />
        <button
          onClick={() => map.zoomOut()}
          className="w-11 h-11 flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors touch-target focus-ring"
          aria-label="Zoom out"
        >
          <Minus size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Locate Button */}
      <button
        onClick={handleLocate}
        disabled={locating}
        className={`
          w-11 h-11 glass rounded-xl flex items-center justify-center
          text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]
          transition-colors shadow-lg border border-[var(--border-subtle)]
          touch-target focus-ring
          ${locating ? 'animate-pulse' : ''}
        `}
        aria-label="My location"
      >
        <Locate size={18} strokeWidth={2} className={locating ? 'animate-spin' : ''} />
      </button>
    </div>
  );
}

// Stats Overlay Component
function StatsOverlay({ count }: { count: number }) {
  return (
    <div className="absolute top-4 left-4 z-[var(--z-dropdown)] glass rounded-xl px-4 py-2.5 shadow-lg border border-[var(--border-subtle)]">
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-green)] block" />
          <span className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[var(--accent-green)] animate-ping opacity-60" />
        </div>
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {count} visible
        </span>
      </div>
    </div>
  );
}

// Loading Overlay Component
function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--bg-primary)]/85 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-3 border-[var(--border-default)] border-t-[var(--accent-green)] rounded-full animate-spin" />
          <div className="absolute inset-0 w-12 h-12 rounded-full bg-[var(--accent-green)]/10 animate-pulse" />
        </div>
        <span className="text-sm text-[var(--text-secondary)] font-medium animate-pulse">
          Loading map...
        </span>
      </div>
    </div>
  );
}

// Empty State Overlay
function EmptyStateOverlay() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[var(--z-dropdown)] glass rounded-2xl px-8 py-6 shadow-xl border border-[var(--border-subtle)] text-center max-w-xs">
      <div className="w-14 h-14 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-3">
        <Radio size={28} className="text-[var(--text-tertiary)]" />
      </div>
      <p className="text-base font-semibold text-[var(--text-primary)]">No incidents</p>
      <p className="text-sm text-[var(--text-secondary)] mt-1">Report an incident to see it on the map</p>
    </div>
  );
}

interface IncidentMapProps {
  incidents: Incident[];
  loading: boolean;
}

export default function IncidentMap({ incidents, loading }: IncidentMapProps) {
  // Only show incidents that have coordinates
  const mappable = incidents.filter((i) => i.latitude != null && i.longitude != null);

  return (
    <div className="relative w-full h-full bg-[var(--bg-primary)]">
      {/* Loading overlay */}
      {loading && <LoadingOverlay />}

      {/* Stats overlay */}
      {!loading && <StatsOverlay count={mappable.length} />}

      {/* Empty state */}
      {!loading && mappable.length === 0 && incidents.length === 0 && <EmptyStateOverlay />}

      <MapContainer
        center={MAP_CONFIG.center}
        zoom={MAP_CONFIG.zoom}
        className="w-full h-full"
        style={{ background: 'var(--bg-primary)' }}
        zoomControl={false}
        minZoom={4}
        maxZoom={18}
      >
        <TileLayer
          url={MAP_CONFIG.tileUrl}
          attribution={MAP_CONFIG.tileAttribution}
        />

        <MapControls />

        {mappable.map((incident) => {
          const color = getSeverityColor(incident.severity_score);
          const radius = Math.min(10 + incident.report_count * 3, 28);
          const isCritical = incident.severity_score >= 8;

          return (
            <CircleMarker
              key={incident.id}
              center={[incident.latitude!, incident.longitude!]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: isCritical ? 0.5 : 0.35,
                weight: isCritical ? 3 : 2,
                opacity: 1,
              }}
              className={isCritical ? 'pulse-marker' : ''}
            >
              <Popup
                closeButton={false}
                className="eifs-popup"
                offset={[0, -5]}
                minWidth={280}
              >
                <IncidentCard incident={incident} compact />
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
