import { useEffect } from 'react';
import { useStore } from '../../core/store/useStore';

// Sync the MediaSession API with player state so car controls can drive playback,
// and lock screens / car displays show the station and, when known, the current song.
export function useMediaSession() {
  const { player, pauseResume, playNext, playPrev, nowPlaying } = useStore();
  const { currentStation, isPlaying } = player;

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!currentStation) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const artwork = currentStation.favicon
      ? [{ src: currentStation.favicon, sizes: '512x512', type: 'image/png' }]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata(
      nowPlaying?.kind === 'song'
        ? { title: nowPlaying.title, artist: nowPlaying.artist, album: currentStation.name, artwork }
        : {
            title: currentStation.name,
            artist: nowPlaying?.kind === 'text' ? nowPlaying.text : currentStation.country || '',
            album: 'Seashell Radio',
            artwork,
          },
    );
  }, [currentStation, nowPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => { void pauseResume(); });
    navigator.mediaSession.setActionHandler('pause', () => { void pauseResume(); });
    navigator.mediaSession.setActionHandler('previoustrack', () => { void playPrev(); });
    navigator.mediaSession.setActionHandler('nexttrack', () => { void playNext(); });
    navigator.mediaSession.setActionHandler('stop', () => {
      useStore.getState().pauseResume();
    });

    return () => {
      (['play', 'pause', 'previoustrack', 'nexttrack', 'stop'] as MediaSessionAction[]).forEach(
        action => navigator.mediaSession.setActionHandler(action, null),
      );
    };
  }, [pauseResume, playNext, playPrev]);
}
