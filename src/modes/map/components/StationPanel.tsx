import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ListMusic } from 'lucide-react';
import type { Country, Station } from '../../../core/types';
import { getStationsByCountry, getStationsByCountryAndTag } from '../../../core/api/radioBrowser';
import { genreLabel } from '../../discovery/components/DiscoverySidebar';
import { useStore } from '../../../core/store/useStore';
import { StationCard } from '../../discovery/components/StationCard';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { countryCodeToFlag } from '../../../shared/utils/countryFlag';

interface Props {
  country: Country;
  onClose: () => void;
}

// Heights are percentages of the map area (the panel's positioned parent)
const MIN_HEIGHT = 25;
const MAX_HEIGHT = 92;
export const DEFAULT_HEIGHT = 40;

export function StationPanel({ country, onClose }: Props) {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const panelRef = useRef<HTMLDivElement>(null);
  const { player, setQueue, playStation, activeTag, setActiveTag } = useStore();

  const startDrag = useCallback((startClientY: number) => {
    const startHeight = height;
    const areaHeight = panelRef.current?.parentElement?.clientHeight || window.innerHeight;

    const onMove = (e: MouseEvent | TouchEvent) => {
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const delta = ((startClientY - y) / areaHeight) * 100;
      setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight + delta)));
    };

    const onEnd = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
  }, [height]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setStations([]);

    // A genre picked in the sidebar narrows the country's stations
    const request = activeTag
      ? getStationsByCountryAndTag(country.iso_3166_1, activeTag)
      : getStationsByCountry(country.iso_3166_1);

    request
      .then(data => {
        if (!cancelled) {
          setStations(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load stations.');
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [country.iso_3166_1, activeTag]);

  const handlePlayAll = () => {
    if (!stations.length) return;
    setQueue(stations, 0);
    void playStation(stations[0], stations);
  };

  const hasNowPlaying = !!player.currentStation;

  return (
    // Slides up from the bottom of the map panel only, so the sidebar stays uncovered
    <div
      ref={panelRef}
      className="absolute bottom-0 left-0 right-0 flex flex-col rounded-t-2xl border-t border-white/[0.06] bg-canvas shadow-2xl"
      style={{ zIndex: 1000, height: `${height}%` }}
    >

      {/* Drag handle */}
      <div
        className="flex flex-shrink-0 cursor-ns-resize touch-none select-none justify-center pb-3 pt-3"
        onMouseDown={e => startDrag(e.clientY)}
        onTouchStart={e => startDrag(e.touches[0].clientY)}
      >
        <div className="w-12 h-1.5 rounded-full bg-surface-border hover:bg-muted transition-colors" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-1 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{countryCodeToFlag(country.iso_3166_1)}</span>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">{country.name}</h2>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>{isLoading ? 'Loading...' : `${stations.length} stations`}</span>
              {activeTag && (
                <button
                  onClick={() => setActiveTag(null)}
                  className="flex items-center gap-1 rounded-md bg-white/[0.07] py-0.5 pl-2 pr-1 text-[11px] font-medium text-white/80 transition-colors hover:bg-white/[0.12] hover:text-white"
                  aria-label={`Clear genre filter ${genreLabel(activeTag)}`}
                >
                  {genreLabel(activeTag)}
                  <X size={11} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stations.length > 0 && (
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/[0.12]"
            >
              <ListMusic size={13} />
              Add all to queue
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Scrollable station list */}
      {/* The now-playing bar floats over the panel's bottom — keep the last rows reachable */}
      <div className={`flex-1 overflow-y-auto px-2 ${hasNowPlaying ? 'pb-24 sm:pb-28' : 'pb-4'}`}>
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <LoadingSpinner size={30} />
          </div>
        ) : error ? (
          <p className="text-center text-red-400 text-sm py-8">{error}</p>
        ) : stations.length === 0 ? (
          <p className="text-center text-muted text-sm py-8">No stations found in this country.</p>
        ) : (
          <div className="flex flex-col gap-0.5 pb-2">
            {stations.map(station => (
              <StationCard key={station.stationuuid} station={station} queue={stations} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
