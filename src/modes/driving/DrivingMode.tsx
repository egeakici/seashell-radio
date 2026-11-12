import { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, Wifi, Compass, Music2, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useStore } from '../../core/store/useStore';
import { useSwipe } from '../../shared/hooks/useSwipe';
import { StationFavicon } from '../../shared/components/StationFavicon';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { countryCodeToFlag } from '../../shared/utils/countryFlag';
import type { Station } from '../../core/types';

// Drive mode: large, glanceable controls inside the normal app shell, so the header
// and mode tabs stay available instead of the whole layout being replaced.
export function DrivingMode() {
  const {
    player,
    pauseResume,
    playNext,
    playPrev,
    playStation,
    toggleFavorite,
    isFavorite,
    queue,
    queueIndex,
    favorites,
    setMode,
    nowPlaying,
  } = useStore();

  const { currentStation, isPlaying, isLoading, error } = player;

  // Keep screen awake while in driving mode (where supported)
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    if ('wakeLock' in navigator) {
      navigator.wakeLock
        .request('screen')
        .then(lock => { wakeLock = lock; })
        .catch(() => null);
    }
    return () => { wakeLock?.release().catch(() => null); };
  }, []);

  const swipeHandlers = useSwipe({
    onLeft: () => { void playNext(); },
    onRight: () => { void playPrev(); },
    threshold: 50,
  });

  const favorite = currentStation ? isFavorite(currentStation.stationuuid) : false;
  const canSkip = queue.length > 1;

  // Station picker: the current queue, or favorites as a one-tap starting point
  const pickerStations = queue.length ? queue : favorites;
  const pickerTitle = queue.length ? 'Up Next' : 'Favorites';

  return (
    <div className="h-full lg:px-3 lg:pb-3 xl:px-5">
      <div className="mx-auto flex h-full max-w-[1624px] select-none gap-3">
        {/* Now playing — swipe left/right to change station */}
        <section
          className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-canvas lg:rounded-2xl lg:border lg:border-white/[0.04]"
          style={{ backgroundImage: 'radial-gradient(ellipse at 50% 15%, rgba(169, 156, 246, 0.10) 0%, transparent 60%)' }}
          {...swipeHandlers}
        >
          <div className="flex items-center justify-between px-6 pt-6 lg:px-10">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isPlaying ? 'animate-pulse bg-live' : 'bg-white/20'}`} />
              <span className={`text-xs font-semibold uppercase tracking-widest ${isPlaying ? 'text-live' : 'text-white/30'}`}>
                {isPlaying ? 'Live' : isLoading ? 'Connecting' : 'Paused'}
              </span>
            </div>
            {canSkip && (
              <span className="text-xs tabular-nums text-white/30">{queueIndex + 1} / {queue.length}</span>
            )}
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8">
            <div className="relative">
              <div
                className="absolute rounded-2xl transition-all duration-700"
                style={{
                  inset: '-24px',
                  background: isPlaying ? 'radial-gradient(ellipse, rgba(169,156,246,0.28) 0%, transparent 70%)' : 'transparent',
                  filter: 'blur(24px)',
                }}
              />
              <StationFavicon src={currentStation?.favicon} name={currentStation?.name ?? ''} size={160} />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
                  <LoadingSpinner size={40} />
                </div>
              )}
            </div>

            {currentStation ? (
              <div className="max-w-xl space-y-2 text-center">
                <h1 className="text-2xl font-bold leading-tight text-white lg:text-3xl">{currentStation.name}</h1>
                {currentStation.country && (
                  <p className="text-base text-white/50">
                    {countryCodeToFlag(currentStation.countrycode)} {currentStation.country}
                  </p>
                )}
                {nowPlaying ? (
                  // Keyed so the card fades in again whenever the track changes
                  <div
                    key={nowPlaying.kind === 'song' ? nowPlaying.artist + nowPlaying.title : nowPlaying.text}
                    className="animate-fade-in mx-auto !mt-5 max-w-md rounded-2xl border border-white/[0.06] bg-white/[0.04] px-5 py-3"
                  >
                    <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-live">
                      <Music2 size={12} aria-hidden />
                      {nowPlaying.kind === 'song' ? 'Now playing' : 'On air'}
                    </p>
                    {nowPlaying.kind === 'song' ? (
                      <>
                        <p className="mt-1 truncate text-lg font-semibold text-white lg:text-xl">{nowPlaying.title}</p>
                        <p className="truncate text-sm text-white/55 lg:text-base">{nowPlaying.artist}</p>
                      </>
                    ) : (
                      <p className="mt-1 truncate text-base text-white/80">{nowPlaying.text}</p>
                    )}
                  </div>
                ) : currentStation.tags && (
                  <p className="text-sm text-white/30">
                    {currentStation.tags.split(',').slice(0, 3).map(t => t.trim()).filter(Boolean).join(' · ')}
                  </p>
                )}
                {currentStation.bitrate > 0 && (
                  <div className="flex items-center justify-center gap-1 text-xs text-white/25">
                    <Wifi size={11} />
                    {currentStation.bitrate}kbps
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xl text-white/40">No station selected</p>
                <p className="mt-2 text-sm text-white/25">
                  {favorites.length ? 'Pick one of your favorites to start.' : 'Find a station in Discover to start listening.'}
                </p>
                <button
                  onClick={() => setMode('discovery')}
                  className="mx-auto mt-5 flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <Compass size={15} />
                  Go to Discover
                </button>
              </div>
            )}

            {error && <p className="px-4 text-center text-sm text-red-400">{error}</p>}
          </div>

          {/* Controls */}
          <div className="px-8 pb-safe-bottom pb-10">
            <div className="mx-auto flex max-w-md items-center justify-between">
              <button
                onClick={() => currentStation && toggleFavorite(currentStation)}
                disabled={!currentStation}
                className={`flex h-14 w-14 items-center justify-center rounded-full transition-all disabled:opacity-30 ${
                  favorite ? 'bg-pink-400/[0.12] text-pink-400' : 'text-white/30 hover:text-white/60'
                }`}
                aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-pressed={favorite}
              >
                <Heart size={24} fill={favorite ? 'currentColor' : 'none'} />
              </button>

              <button
                onClick={() => { void playPrev(); }}
                disabled={!canSkip}
                className="flex h-16 w-16 items-center justify-center text-white/45 transition-colors hover:text-white disabled:opacity-20"
                aria-label="Previous station"
              >
                <SkipBack size={34} />
              </button>

              <button
                onClick={() => { void pauseResume(); }}
                disabled={!currentStation}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-shell transition-transform hover:scale-[1.03] disabled:opacity-30"
                style={{
                  boxShadow: isPlaying ? '0 0 40px rgba(169,156,246,0.3), 0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.45)',
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isLoading ? <LoadingSpinner size={36} className="text-shell" /> : isPlaying ? <Pause size={40} /> : <Play size={40} className="ml-1" />}
              </button>

              <button
                onClick={() => { void playNext(); }}
                disabled={!canSkip}
                className="flex h-16 w-16 items-center justify-center text-white/45 transition-colors hover:text-white disabled:opacity-20"
                aria-label="Next station"
              >
                <SkipForward size={34} />
              </button>

              {/* Same size as the favorite button, so play stays centered */}
              <DriveVolume />
            </div>

            {canSkip && (
              <p className="mt-6 text-center text-xs text-white/20">← Swipe left: next · Swipe right: previous →</p>
            )}
          </div>
        </section>

        {/* Station picker — large touch targets, desktop / landscape tablets */}
        {pickerStations.length > 0 && (
          <aside className="hidden w-[360px] flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-white/[0.04] bg-panel lg:flex xl:w-[400px]">
            <h2 className="px-6 pb-3 pt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">{pickerTitle}</h2>
            <div className="flex-1 overflow-y-auto px-3 pb-6">
              {pickerStations.map(station => (
                <PickerRow
                  key={station.stationuuid}
                  station={station}
                  active={currentStation?.stationuuid === station.stationuuid}
                  onClick={() => { void playStation(station, pickerStations); }}
                />
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function PickerRow({ station, active, onClick }: { station: Station; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={`relative flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors ${
        active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" aria-hidden />}
      <StationFavicon src={station.favicon} name={station.name} size={52} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-white">{station.name}</p>
        <p className="truncate text-sm text-white/40">{station.country}</p>
      </div>
    </button>
  );
}

// Mute toggle, mirroring the favorite button. On pointer devices a vertical slider opens
// above it on hover/focus; phones keep using their hardware volume buttons.
function DriveVolume() {
  const { volume, setVolume } = useStore();
  const [prevVol, setPrevVol] = useState(volume > 0 ? volume : 0.8);
  const muted = volume === 0;
  const Icon = muted ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const toggleMute = () => {
    if (muted) {
      setVolume(prevVol);
    } else {
      setPrevVol(volume);
      setVolume(0);
    }
  };

  return (
    <div className="group relative">
      {/* pb-3 bridges the gap, so moving the pointer up to the slider keeps it open */}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 pb-3 opacity-0 transition-opacity duration-200 [@media(hover:hover)]:group-focus-within:pointer-events-auto [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100">
        <div className="flex h-40 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-surface/95 shadow-float backdrop-blur-xl">
          <div className="-rotate-90">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              className="vol-slider vol-slider--static"
              style={{
                background: `linear-gradient(to right, #d4cdfb ${volume * 100}%, rgba(255,255,255,0.12) ${volume * 100}%)`,
              }}
              aria-label="Volume"
            />
          </div>
        </div>
      </div>

      <button
        onClick={toggleMute}
        className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
          muted ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/60'
        }`}
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
      >
        <Icon size={24} />
      </button>
    </div>
  );
}
