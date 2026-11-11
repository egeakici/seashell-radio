import { useStore } from './core/store/useStore';
import { DiscoveryMode } from './modes/discovery/DiscoveryMode';
import { MapMode } from './modes/map/MapMode';
import { DrivingMode } from './modes/driving/DrivingMode';
import { useMediaSession } from './shared/hooks/useMediaSession';
import { useAudioEvents } from './shared/hooks/useAudioEvents';
import { Radio, Car, Compass, Map } from 'lucide-react';
import type { AppMode } from './core/types';

const NAV_TABS: { id: AppMode; label: string; icon: typeof Compass }[] = [
  { id: 'discovery', label: 'Discover', icon: Compass },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'driving', label: 'Drive', icon: Car },
];

export default function App() {
  const { mode, setMode } = useStore();

  // Global hooks — mount once, always active regardless of mode
  useAudioEvents();
  useMediaSession();

  return (
    <div className="h-dvh flex flex-col bg-shell text-white overflow-hidden">
      <header
        className="relative z-[1200] flex h-14 flex-shrink-0 items-center px-4 md:h-16 lg:px-6 xl:px-8"
        // Keeps the header clear of the notch / status bar when installed as an app
        style={{ paddingTop: 'env(safe-area-inset-top)', boxSizing: 'content-box' }}
      >
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
              <Radio size={17} className="text-accent-glow" strokeWidth={2} />
            </div>
            <span className="text-[16px] font-semibold leading-none tracking-[-0.01em]">
              <span className="text-white">Radio</span>
              <span className="text-white/45">Browser</span>
            </span>
          </div>

          {/* Navigation — tablets and desktop; phones use the bottom tab bar */}
          <nav
            role="tablist"
            className="hidden items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] p-1 md:flex"
          >
            {NAV_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = mode === tab.id;

              return (
                <button
                  key={tab.id}
                  role="tab"
                  onClick={() => setMode(tab.id)}
                  aria-selected={isActive}
                  className={`flex h-8 min-w-[92px] items-center justify-center gap-2 rounded-full px-4 text-[13px] font-medium transition-colors duration-200 ${
                    isActive
                      ? 'bg-white/[0.10] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                      : 'text-white/45 hover:bg-white/[0.04] hover:text-white/80'
                  }`}
                >
                  <Icon size={15} strokeWidth={2} className={isActive ? 'text-accent-glow' : ''} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mode content — each mode lays out its own panels and now-playing bar */}
      <main className="flex-1 overflow-hidden relative">
        {mode === 'discovery' && <DiscoveryMode />}
        {mode === 'map' && <MapMode />}
        {mode === 'driving' && <DrivingMode />}
      </main>

      {/* Bottom tab bar — phones only, within thumb reach */}
      <nav
        role="tablist"
        className="relative z-[1200] flex flex-shrink-0 border-t border-white/[0.06] bg-shell md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = mode === tab.id;

          return (
            <button
              key={tab.id}
              role="tab"
              onClick={() => setMode(tab.id)}
              aria-selected={isActive}
              className={`flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-white' : 'text-white/40 active:text-white/70'
              }`}
            >
              <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-white/[0.10]' : ''}`}>
                <Icon size={18} strokeWidth={2} className={isActive ? 'text-accent-glow' : ''} />
              </span>
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
