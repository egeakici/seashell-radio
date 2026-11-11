import { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, Music2, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useStore } from '../../core/store/useStore';
import { StationFavicon } from './StationFavicon';
import { LoadingSpinner } from './LoadingSpinner';
import { formatTrack } from '../utils/track';

// Floats at the bottom of the nearest positioned parent (the content panel or the map).
// Phones: full-width compact mini player. Larger screens: centered 520px bar.
export function NowPlayingBar() {
  const { player, pauseResume, playNext, playPrev, mode, mapPanelOpen, volume, setVolume, toggleFavorite, isFavorite, nowPlaying } = useStore();
  const [prevVol, setPrevVol] = useState(volume > 0 ? volume : 0.8);

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVol(volume);
      setVolume(0);
    } else {
      setVolume(prevVol);
    }
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const { currentStation, isPlaying, isLoading } = player;

  if (!currentStation) return null;
  if (mode === 'map' && mapPanelOpen) return null;

  const favorite = isFavorite(currentStation.stationuuid);

  return (
    <div
      className="absolute inset-x-2 bottom-2 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[rgba(35,34,44,0.85)] px-3 py-2.5 shadow-float backdrop-blur-2xl sm:inset-x-auto sm:bottom-5 sm:left-1/2 sm:w-[520px] sm:max-w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:gap-4 sm:px-4 sm:py-3"
      style={{ zIndex: 1100 }}
    >
      <div className="relative flex-shrink-0">
        <StationFavicon src={currentStation.favicon} name={currentStation.name} size={44} />
        {isPlaying && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-surface bg-live" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{currentStation.name}</p>
        {nowPlaying ? (
          // Keyed so the text fades in again whenever the track changes
          <p key={formatTrack(nowPlaying)} className="animate-fade-in flex min-w-0 items-center gap-1.5 text-xs text-white/70" title={formatTrack(nowPlaying)}>
            <Music2 size={12} className="flex-shrink-0 text-live" aria-hidden />
            <span className="truncate">{formatTrack(nowPlaying)}</span>
          </p>
        ) : (
          <p className="text-xs text-muted truncate">
            {[currentStation.country, currentStation.bitrate ? `${currentStation.bitrate}kbps` : ''].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
        {/* Phones control volume with their hardware buttons */}
        <div
          className="volume-control hidden sm:flex"
          onMouseLeave={e => {
            const active = document.activeElement;
            if (active instanceof HTMLElement && e.currentTarget.contains(active)) {
              active.blur();
            }
          }}
        >
          <button onClick={toggleMute} className="volume-button" aria-label="Toggle mute">
            <VolumeIcon size={18} />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="vol-slider"
            style={{
              background: `linear-gradient(to right, #d4cdfb ${volume * 100}%, rgba(255,255,255,0.12) ${volume * 100}%)`,
            }}
            aria-label="Volume"
          />
        </div>

        <div className="mx-0.5 hidden h-5 w-px flex-shrink-0 bg-white/10 sm:block" />

        <button onClick={() => { void playPrev(); }} className="hidden p-2 text-muted transition-colors hover:text-white sm:block" aria-label="Previous station">
          <SkipBack size={18} />
        </button>
        <button
          onClick={() => { void pauseResume(); }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-shell transition-transform hover:scale-105"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? <LoadingSpinner size={18} className="text-shell" /> : isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
        <button onClick={() => { void playNext(); }} className="p-2 text-muted hover:text-white transition-colors" aria-label="Next station">
          <SkipForward size={18} />
        </button>
        <button
          onClick={() => toggleFavorite(currentStation)}
          className={`p-2 transition-colors ${favorite ? 'text-pink-400 hover:text-pink-300' : 'text-muted hover:text-white'}`}
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={favorite}
        >
          <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {player.error && (
        <p className="absolute -top-6 left-1/2 max-w-full -translate-x-1/2 truncate whitespace-nowrap text-xs text-red-400">{player.error}</p>
      )}
    </div>
  );
}
