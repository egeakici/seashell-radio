import { useEffect, useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { useStations } from '../hooks/useStations';
import { useCountries } from '../hooks/useCountries';
import { genreLabel } from './DiscoverySidebar';
import { StationCard } from './StationCard';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { useStore } from '../../../core/store/useStore';
import { getTrendingStations } from '../../../core/api/radioBrowser';
import type { Station } from '../../../core/types';

interface ViewProps {
  title: string;
  /** Context shown before the station count, e.g. the country */
  subtitle?: string;
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
export function StationListView({ title, subtitle, stations, isLoading, error, onRetry, empty, actions }: ViewProps) {
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
      <div className="mb-4 flex items-end justify-between gap-3 px-2">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold tracking-[-0.01em] text-white">{title}</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {subtitle && <>{subtitle} · </>}
            {stations.length} stations
          </p>
        </div>
        {actions && <div className="flex flex-shrink-0 items-center gap-3 pb-0.5">{actions}</div>}
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
  const { countries } = useCountries();
  const countryName = countries.find(c => c.iso_3166_1 === selectedCountryCode)?.name ?? selectedCountryCode;

  let title: string;
  let subtitle: string | undefined;
  if (searchQuery.trim()) {
    title = `Results for "${searchQuery.trim()}"`;
  } else if (activeTag) {
    title = genreLabel(activeTag);
    subtitle = countryName ?? 'Worldwide';
  } else if (countryName) {
    title = countryName;
    subtitle = 'Most popular';
  } else {
    title = 'Top Rated';
    subtitle = 'Worldwide';
  }

  return (
    <StationListView
      title={title}
      subtitle={subtitle}
      stations={stations}
      isLoading={isLoading}
      error={error}
      onRetry={refresh}
    />
  );
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
      title="Trending"
      subtitle="Most listened in the last 24 hours"
      stations={stations}
      isLoading={isLoading}
      error={error}
      onRetry={() => setVersion(v => v + 1)}
    />
  );
}
