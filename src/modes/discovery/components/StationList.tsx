import { useEffect, useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { useStations } from '../hooks/useStations';
import { StationCard } from './StationCard';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { useStore } from '../../../core/store/useStore';
import { getTrendingStations } from '../../../core/api/radioBrowser';
import type { Station } from '../../../core/types';

interface ViewProps {
  title: string;
  stations: Station[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Shown instead of the list when there are no stations */
  empty?: ReactNode;
  /** Extra controls next to the station count (e.g. delete / clear) */
  actions?: ReactNode;
}

// Shared layout for every station list: header, loading/error/empty states, cards
export function StationListView({ title, stations, isLoading, error, onRetry, empty, actions }: ViewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <LoadingSpinner size={36} />
        <p className="text-muted text-sm">Loading stations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-red-400 text-sm text-center">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-card text-sm text-muted hover:text-white transition-colors"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="truncate text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
        <div className="flex flex-shrink-0 items-center gap-3">
          <span className="text-xs text-muted">{stations.length} stations</span>
          {actions}
        </div>
      </div>

      {stations.length ? (
        <div className="flex flex-col gap-1">
          {stations.map(station => (
            <StationCard key={station.stationuuid} station={station} queue={stations} />
          ))}
        </div>
      ) : (
        empty ?? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-muted text-sm">No stations found for these filters.</p>
          </div>
        )
      )}
    </div>
  );
}

// Browse: search results, or stations filtered by country / genre
export function StationList() {
  const { stations, isLoading, error, refresh } = useStations();
  const { selectedCountryCode, searchQuery, activeTag } = useStore();

  const title = searchQuery.trim()
    ? `Results for "${searchQuery}"`
    : selectedCountryCode && activeTag
    ? `${selectedCountryCode} · ${activeTag}`
    : selectedCountryCode
    ? `${selectedCountryCode} stations`
    : activeTag
    ? `${activeTag} stations`
    : 'Top Rated Worldwide';

  return <StationListView title={title} stations={stations} isLoading={isLoading} error={error} onRetry={refresh} />;
}

// Trending: most listened stations over the last 24 hours
export function TrendingList() {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getTrendingStations(100)
      .then(results => { if (!cancelled) setStations(results); })
      .catch(() => { if (!cancelled) setError('Failed to load trending stations. Please try again.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [version]);

  return (
    <StationListView
      title="Trending · Last 24 hours"
      stations={stations}
      isLoading={isLoading}
      error={error}
      onRetry={() => setVersion(v => v + 1)}
    />
  );
}
