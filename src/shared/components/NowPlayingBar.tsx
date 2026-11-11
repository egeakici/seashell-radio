import { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useStore } from '../../core/store/useStore';
import { StationFavicon } from './StationFavicon';
import { LoadingSpinner } from './LoadingSpinner';

interface Props {
  /**
   * 'viewport' centers the bar on the screen (map mode).
   * 'container' centers it inside the nearest positioned parent (the discovery content column).
   */
  placement?: 'viewport' | 'container';
}

export function NowPlayingBar({ placement = 'viewport' }: Props) {
  const { player, pauseResume, playNext, playPrev, mode, mapPanelOpen, volume, setVolume, toggleFavorite, isFavorite } = useStore();
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
      className={`${placement === 'viewport' ? 'fixed' : 'absolute'} bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-2xl border border-white/[0.08] bg-[rgba(35,34,44,0.78)] px-4 py-3 shadow-float backdrop-blur-2xl`}
      style={{ zIndex: 1100, width: '520px', maxWidth: placement === 'viewport' ? 'calc(100vw - 2rem)' : 'calc(100% - 2rem)' }}
    >
      <div className="relative flex-shrink-0">
        <StationFavicon src={currentStation.favicon} name={currentStation.name} size={48} />
        {isPlaying && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-surface bg-live" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{currentStation.name}</p>
        <p className="text-xs text-muted truncate">
          {[currentStation.country, currentStation.bitrate ? `${currentStation.bitrate}kbps` : ''].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div
          className="volume-control"
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

        <div className="w-px h-5 bg-white/10 mx-0.5 flex-shrink-0" />

        <button onClick={() => { void playPrev(); }} className="p-2 text-muted hover:text-white transition-colors" aria-label="Previous station">
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
        <p className="text-xs text-red-400 absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">{player.error}</p>
      )}
    </div>
  );
}
