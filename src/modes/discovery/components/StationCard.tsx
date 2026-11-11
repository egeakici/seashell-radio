import { useCallback, useState } from 'react';
import { Play, Pause, Heart, Wifi, ListPlus } from 'lucide-react';
import { useStore } from '../../../core/store/useStore';
import { StationFavicon } from '../../../shared/components/StationFavicon';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { AddToListMenu } from './AddToListMenu';
import type { Station } from '../../../core/types';

interface Props {
  station: Station;
  queue: Station[];
}

export function StationCard({ station, queue }: Props) {
  const { player, playStation, pauseResume, toggleFavorite, isFavorite, lists } = useStore();
  const [listAnchor, setListAnchor] = useState<HTMLElement | null>(null);
  const closeListMenu = useCallback(() => setListAnchor(null), []);

  const isThisStation = player.currentStation?.stationuuid === station.stationuuid;
  const isPlaying = isThisStation && player.isPlaying;
  const isLoading = isThisStation && player.isLoading;
  const favorite = isFavorite(station.stationuuid);
  const inAnyList = lists.some(l => l.stations.some(st => st.stationuuid === station.stationuuid));

  const handlePlay = () => {
    if (isThisStation) {
      void pauseResume();
    } else {
      void playStation(station, queue);
    }
  };

  const tags = station.tags
    ? station.tags.split(',').slice(0, 2).map(t => t.trim()).filter(Boolean)
    : [];

  return (
    <div
      className={`group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-xl px-2 py-2.5 transition-colors sm:px-4 sm:py-3 ${
        isThisStation ? 'bg-white/[0.06]' : 'hover:bg-white/[0.035]'
      }`}
      onClick={handlePlay}
    >
      {/* Active left-edge indicator */}
      {isThisStation && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-r-full bg-accent" />
      )}

      <StationFavicon src={station.favicon} name={station.name} size={46} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isPlaying && (
            <span className="eq-bars flex-shrink-0 text-live" aria-hidden>
              <span /><span /><span />
            </span>
          )}
          <p className="truncate text-sm font-semibold text-white">{station.name}</p>
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap">
          {tags.map(tag => (
            <span key={tag} className="min-w-0 truncate text-xs text-muted">
              {tag}
            </span>
          ))}
          {station.bitrate > 0 && (
            <span className="flex flex-shrink-0 items-center gap-1 text-xs text-muted">
              <Wifi size={10} />
              {station.bitrate}k
            </span>
          )}
        </div>
      </div>

      {/* Revealed on hover with a mouse; always visible on touch screens, which have no hover */}
      <div className={`flex items-center gap-0.5 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${listAnchor ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={e => {
            e.stopPropagation();
            const target = e.currentTarget;
            setListAnchor(a => (a ? null : target));
          }}
          className={`rounded-full p-2 transition-all sm:p-1.5 ${
            inAnyList || listAnchor ? 'text-accent-glow' : 'text-muted hover:text-white'
          }`}
          aria-label="Add to list"
          aria-expanded={!!listAnchor}
        >
          <ListPlus size={16} />
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            toggleFavorite(station);
          }}
          className={`rounded-full p-2 transition-all sm:p-1.5 ${
            favorite
              ? 'text-pink-400'
              : 'text-muted hover:text-pink-400'
          }`}
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={16} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {listAnchor && <AddToListMenu station={station} anchor={listAnchor} onClose={closeListMenu} />}

      <button
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
          isThisStation
            ? 'bg-white text-shell'
            : 'bg-white/[0.06] text-white/80 group-hover:bg-white group-hover:text-shell'
        }`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        onClick={e => { e.stopPropagation(); handlePlay(); }}
      >
        {isLoading ? (
          <LoadingSpinner size={16} className="text-shell" />
        ) : isPlaying ? (
          <Pause size={16} />
        ) : (
          <Play size={16} className="ml-0.5" />
        )}
      </button>
    </div>
  );
}
