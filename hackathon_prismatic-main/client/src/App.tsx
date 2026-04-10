// ═══════════════════════════════════════════════════════════
// AI-01 EIFS — Emergency Intelligence Fusion System
// "The Silent Sentinel" — Tactical Intelligence & Command
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

// Material Symbols Icon Component
function MaterialIcon({ name, className = '', filled = false }: { name: string; className?: string; filled?: boolean }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}
    >
      {name}
    </span>
  );
}
import { Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import { useRealtimeIncidents } from './hooks/useRealtimeIncidents';
import IncidentMap from './components/dashboard/IncidentMap';
import IncidentFeed from './components/dashboard/IncidentFeed';
import StatsBar from './components/dashboard/StatsBar';
import SeverityChart from './components/dashboard/SeverityChart';
import ReportForm from './components/dashboard/ReportForm';
<<<<<<< HEAD
=======
import MetricsPanel from './components/dashboard/MetricsPanel';
>>>>>>> c91130b (naveeth changes)
import { LiveAgent, GeminiLiveMode } from './components/agent';

type MobileTab = 'map' | 'feed' | 'stats';

// ═══════════════════════════════════════════════════════════
// Header Component - Tactical Command Bar (AI-01 Sentinel)
// ═══════════════════════════════════════════════════════════

function Header() {
  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-[var(--z-sticky)] safe-top
        transition-all duration-300 bg-[#10141a]
        border-b border-[#31353c]/30
      `}
    >
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-7xl mx-auto">
        {/* Logo - AI-01 Sentinel Branding */}
        <div className="flex items-center gap-3">
          <MaterialIcon name="security" className="text-xl text-[var(--primary)]" />
          <span className="text-xl font-bold tracking-tighter text-[#adc6ff] font-headline">AI-01 SENTINEL</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 text-[#adc6ff]">
          <span className="hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[var(--primary)]">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
            Live
          </span>
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════
// Mobile Bottom Navigation - AI-01 Sentinel Style
// ═══════════════════════════════════════════════════════════

function MobileNav({
  activeTab,
  onTabChange,
  onReportClick
}: {
  activeTab: MobileTab
  onTabChange: (tab: MobileTab) => void;
  onReportClick: () => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0a0e14] border-t border-[#31353c]/30 flex items-center justify-around px-4 z-[var(--z-sticky)] hide-desktop">
      <button
        onClick={() => onTabChange('map')}
<<<<<<< HEAD
        className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'map' ? 'text-[#adc6ff]' : 'text-[#dfe2eb]/40'}`}
=======
        className={`flex flex-col items-center gap-1 min-h-[44px] transition-colors ${activeTab === 'map' ? 'text-[#adc6ff]' : 'text-[#dfe2eb]/40'}`}
>>>>>>> c91130b (naveeth changes)
      >
        <MaterialIcon name="map" />
        <span className="text-[8px] font-bold uppercase tracking-widest">Map</span>
      </button>

      {/* Report Button - Central CTA */}
      <button
        onClick={onReportClick}
<<<<<<< HEAD
        className="flex flex-col items-center gap-1 -mt-6"
=======
        className="flex flex-col items-center gap-1 -mt-6 min-h-[44px]"
>>>>>>> c91130b (naveeth changes)
      >
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--tertiary)] to-[var(--tertiary-container)] flex items-center justify-center shadow-[0_0_20px_rgba(255,176,148,0.3)] active:scale-95 transition-transform">
          <MaterialIcon name="add" className="text-[var(--on-tertiary)] text-2xl" filled />
        </div>
        <span className="text-[8px] font-bold text-[var(--tertiary)] uppercase tracking-widest">Report</span>
      </button>

      <button
        onClick={() => onTabChange('feed')}
<<<<<<< HEAD
        className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'feed' ? 'text-[#adc6ff]' : 'text-[#dfe2eb]/40'}`}
=======
        className={`flex flex-col items-center gap-1 min-h-[44px] transition-colors ${activeTab === 'feed' ? 'text-[#adc6ff]' : 'text-[#dfe2eb]/40'}`}
>>>>>>> c91130b (naveeth changes)
      >
        <MaterialIcon name="list" />
        <span className="text-[8px] font-bold uppercase tracking-widest">Feed</span>
      </button>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════
// Mobile Stats View - Tactical HUD
// ═══════════════════════════════════════════════════════════

function MobileStatsView({ incidents }: { incidents: any[] }) {
  const criticalCount = incidents.filter((i) => i.severity_score >= 8).length;

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-4 space-y-4 pt-20">
      {/* Mission Status Card */}
      <div className="card p-4 card-status">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center"
            >
              <MaterialIcon name="activity_zone" className="text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="font-headline text-sm font-bold text-[var(--on-surface)] uppercase tracking-wide">
                Mission Status
              </h2>
              <p className="text-[10px] text-[var(--on-surface-variant)] tracking-wider uppercase">
                Sector_01 Active
              </p>
            </div>
          </div>
          <div className="badge badge-live">
            <span className="badge-dot" />
            Live
          </div>
        </div>

        {criticalCount > 0 ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-[var(--tertiary)]/10"
          >
            <MaterialIcon name="warning" className="text-[var(--tertiary)] text-sm" />
            <span className="text-[11px] font-semibold text-[var(--tertiary)] uppercase tracking-wider">
              {criticalCount} Critical Alert{criticalCount > 1 ? 's' : ''} Active
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-[var(--accent-green)]/10"
          >
            <MaterialIcon name="shield" className="text-[var(--accent-green)] text-sm" />
            <span className="text-[11px] font-semibold text-[var(--accent-green)] uppercase tracking-wider">
              All Systems Nominal
            </span>
          </div>
        )}
      </div>

      <StatsBar incidents={incidents} variant="mobile" />

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <MaterialIcon name="bar_chart" className="text-[var(--primary)]" />
          <h3 className="font-headline text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-widest"
          >
            Threat Distribution
          </h3>
        </div>
        <SeverityChart incidents={incidents} />
      </div>
<<<<<<< HEAD
=======

      <MetricsPanel />
>>>>>>> c91130b (naveeth changes)
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Report Modal - Tactical Bottom Sheet
// ═══════════════════════════════════════════════════════════

function ReportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`
        fixed inset-0
        ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}
      `}
      style={{ zIndex: 999999 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      {/* Backdrop */}
      <div
        className="backdrop-overlay"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal - Bottom Sheet on mobile, Centered on desktop */}
      <div
        className={`
          absolute left-0 right-0 bottom-0 md:left-1/2 md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2
          md:w-full md:max-w-lg
<<<<<<< HEAD
=======
          h-screen md:h-auto
>>>>>>> c91130b (naveeth changes)
          bottom-sheet
          ${isClosing ? 'translate-y-full md:scale-95 md:opacity-0' : ''}
        `}
        style={{
          animation: isClosing ? 'none' : undefined,
        }}
      >
        {/* Handle - Mobile only */}
        <div className="md:hidden bottom-sheet-handle" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--outline-variant)]/20"
        >
          <div className="flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center"
            >
              <MaterialIcon name="add" className="text-[var(--primary)]" />
            </div>
            <div>
              <h2
                id="report-modal-title"
                className="font-headline text-lg font-bold text-[var(--on-surface)] uppercase tracking-tight"
              >
                New Report
              </h2>
              <p className="text-[11px] text-[var(--on-surface-variant)] tracking-wide"
              >
                Submit incident intelligence
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
<<<<<<< HEAD
            className="w-9 h-9 rounded-lg bg-[var(--surface-container)] flex items-center justify-center text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors focus-ring"
=======
            className="w-9 h-9 min-h-[44px] min-w-[44px] rounded-lg bg-[var(--surface-container)] flex items-center justify-center text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors focus-ring"
>>>>>>> c91130b (naveeth changes)
            aria-label="Close modal"
          >
            <MaterialIcon name="close" className="text-sm" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4 md:p-5" style={{ maxHeight: 'calc(90vh - 80px)' }}
        >
          <ReportForm onSuccess={handleClose} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Empty State Component - Tactical
// ═══════════════════════════════════════════════════════════

function EmptyState({ type }: { type: 'map' | 'feed' | 'stats' }) {
  const content = {
    map: {
      icon: 'location_on',
      title: 'No Signal',
      description: 'Awaiting incident telemetry'
    },
    feed: {
      icon: 'rss_feed',
      title: 'No Active Transmissions',
      description: 'Report to establish comm link'
    },
    stats: {
      icon: 'bar_chart',
      title: 'No Telemetry Data',
      description: 'Analytics pending report ingestion'
    }
  };

  const { icon, title, description } = content[type];

  return (
    <div className="empty-state h-full">
      <div className="empty-state-icon">
        <MaterialIcon name={icon} />
      </div>
      <p className="font-headline text-sm font-bold text-[var(--on-surface)] uppercase tracking-wide">{title}</p>
      <p className="text-[11px] mt-1 text-[var(--on-surface-variant)] tracking-wide">{description}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Dashboard
// ═══════════════════════════════════════════════════════════

function Dashboard() {
  const { incidents, loading } = useRealtimeIncidents();
  const [mobileTab, setMobileTab] = useState<MobileTab>('map');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [liveVoiceOpen, setLiveVoiceOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // Handle resize with debounce
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsDesktop(window.innerWidth >= 768);
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Desktop Layout
  if (isDesktop) {
    return (
      <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)] overflow-hidden">
        <Toaster
          theme="dark"
          position="top-right"
          richColors
          toastOptions={{
            style: {
              background: 'var(--surface-container-low)',
              border: '1px solid rgba(65, 71, 85, 0.3)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'Inter, system-ui, sans-serif',
            },
          }}
        />
        <Header />

        {/* Desktop Content */}
        <div className="flex-1 flex overflow-hidden pt-16">
          {/* Left: Map (60%) */}
          <div className="w-[60%] h-full border-r border-[var(--outline-variant)]/20 relative">
            <ErrorBoundary fallback={
              <div className="flex items-center justify-center h-full bg-[var(--bg-primary)] text-[var(--on-surface-variant)]">
                <EmptyState type="map" />
              </div>
            }>
              <IncidentMap incidents={incidents} loading={loading} />
            </ErrorBoundary>
          </div>

          {/* Right: Stats + Chart + Feed (40%) */}
          <div className="w-[40%] h-full flex flex-col bg-[var(--surface-container-lowest)]">
            <StatsBar incidents={incidents} />
            <div className="border-b border-[var(--outline-variant)]/20">
              <SeverityChart incidents={incidents} />
            </div>
<<<<<<< HEAD
=======
            <div className="px-4 pt-3">
              <MetricsPanel />
            </div>
>>>>>>> c91130b (naveeth changes)
            <div className="flex-1 overflow-hidden">
              <IncidentFeed incidents={incidents} loading={loading} />
            </div>
          </div>
        </div>

        {/* Desktop Floating Action Buttons Container */}
        <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3" style={{ zIndex: 999999 }}>
          {/* AI Agent Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              console.log('AI Agent button clicked');
              setAgentOpen(true);
            }}
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] text-[var(--on-primary)] flex items-center justify-center shadow-[0_4px_20px_rgba(173,198,255,0.35)] hover:shadow-[0_6px_30px_rgba(173,198,255,0.5)] hover:scale-110 active:scale-95 transition-all duration-200 focus-ring cursor-pointer border-2 border-[var(--primary)]/20"
            aria-label="Open AI Emergency Assistant"
          >
            <MaterialIcon name="smart_toy" className="text-xl" />
          </button>

          {/* Report FAB */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              console.log('Report button clicked');
              setReportModalOpen(true);
            }}
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--tertiary)] to-[var(--tertiary-container)] text-[var(--on-tertiary)] flex items-center justify-center shadow-[0_4px_20px_rgba(255,176,148,0.35)] hover:shadow-[0_6px_30px_rgba(255,176,148,0.5)] hover:scale-110 active:scale-95 transition-all duration-200 focus-ring cursor-pointer border-2 border-[var(--tertiary)]/20"
            aria-label="Report new incident"
          >
            <MaterialIcon name="add" className="text-xl" />
          </button>
        </div>

        {/* AI Agent Modal */}
        <LiveAgent
          isOpen={agentOpen}
          onClose={() => setAgentOpen(false)}
          onStartLiveVoice={() => {
            setAgentOpen(false);
            setLiveVoiceOpen(true);
          }}
        />

        {/* Live Voice Mode - Full Page */}
        {liveVoiceOpen && <GeminiLiveMode onClose={() => setLiveVoiceOpen(false)} />}

        {/* Report Modal - Rendered with highest z-index to be above map */}
        <ReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} />
      </div>
    );
  }

  // Mobile Layout
  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)] overflow-hidden">
      <Toaster
        theme="dark"
        position="top-center"
        richColors
        toastOptions={{
          style: {
            background: 'var(--surface-container-low)',
            border: '1px solid rgba(65, 71, 85, 0.3)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        }}
      />
      <Header />

      {/* Mobile Content */}
      {!liveVoiceOpen ? (
        <>
          <main className="flex-1 overflow-hidden relative pb-24">
            {mobileTab === 'map' && (
              <div className="w-full h-full animate-fadeIn">
                <ErrorBoundary fallback={
                  <div className="flex items-center justify-center h-full bg-[var(--bg-primary)] text-[var(--on-surface-variant)]">
                    <EmptyState type="map" />
                  </div>
                }>
                  <IncidentMap incidents={incidents} loading={loading} />
                </ErrorBoundary>
              </div>
            )}

            {mobileTab === 'feed' && (
              <div className="w-full h-full animate-slideInUp pt-16">
                <IncidentFeed incidents={incidents} loading={loading} variant="mobile" />
              </div>
            )}

            {mobileTab === 'stats' && (
              <div className="w-full h-full animate-slideInUp">
                <MobileStatsView incidents={incidents} />
              </div>
            )}
          </main>

          {/* Mobile AI Agent Button - Tactical */}
          <button
            onClick={() => setAgentOpen(true)}
            className="fixed bottom-28 right-4 w-11 h-11 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] text-[var(--on-primary)] flex items-center justify-center shadow-[0_0_16px_rgba(173,198,255,0.25)] hover:shadow-[0_0_24px_rgba(173,198,255,0.35)] hover:scale-105 active:scale-95 transition-all z-40 focus-ring hide-desktop"
            aria-label="Open AI Emergency Assistant"
          >
            <MaterialIcon name="smart_toy" />
          </button>

          {/* Mobile Navigation */}
          <MobileNav
            activeTab={mobileTab}
            onTabChange={setMobileTab}
            onReportClick={() => setReportModalOpen(true)}
          />

          {/* AI Agent Modal */}
          <LiveAgent
            isOpen={agentOpen}
            onClose={() => setAgentOpen(false)}
            onStartLiveVoice={() => {
              setAgentOpen(false);
              setLiveVoiceOpen(true);
            }}
          />
        </>
      ) : (
        /* Live Voice Mode - Full Page */
        <GeminiLiveMode onClose={() => setLiveVoiceOpen(false)} />
      )}

      {/* Report Modal - Single instance for both desktop and mobile */}
      <ReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// App Entry
// ═══════════════════════════════════════════════════════════

export default function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
