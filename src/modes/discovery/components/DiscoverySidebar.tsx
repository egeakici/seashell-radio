import { useRef, useState, type ReactNode } from 'react';
import {
  AudioWaveform, Compass, Disc3, Flame, Guitar, Headphones, Heart, ListMusic,
  MessageCircle, MicVocal, Music, Music2, Newspaper, Piano, Plus, Trees, type LucideIcon,
} from 'lucide-react';
import { useStore } from '../../../core/store/useStore';
import { CountrySelector } from './CountrySelector';

// null = browse, 'favorites', or a custom list id
export type DiscoveryView = null | 'favorites' | string;

// Class strings are written out in full so Tailwind can see them
const GENRES: { label: string; value: string; icon: LucideIcon; tile: string }[] = [
  { label: 'Pop', value: 'pop', icon: Music2, tile: 'bg-pink-500/15 text-pink-300' },
  { label: 'Rock', value: 'rock', icon: Guitar, tile: 'bg-red-500/15 text-red-300' },
  { label: 'Jazz', value: 'jazz', icon: Piano, tile: 'bg-amber-500/15 text-amber-300' },
  { label: 'Classical', value: 'classical', icon: Music, tile: 'bg-yellow-500/15 text-yellow-200' },
  { label: 'Electronic', value: 'electronic', icon: AudioWaveform, tile: 'bg-cyan-500/15 text-cyan-300' },
  { label: 'Hip-Hop', value: 'hiphop', icon: MicVocal, tile: 'bg-violet-500/15 text-violet-300' },
  { label: 'News', value: 'news', icon: Newspaper, tile: 'bg-sky-500/15 text-sky-300' },
  { label: 'Talk', value: 'talk', icon: MessageCircle, tile: 'bg-indigo-500/15 text-indigo-300' },
  { label: 'Folk', value: 'folk', icon: Trees, tile: 'bg-emerald-500/15 text-emerald-300' },
  { label: 'Dance', value: 'dance', icon: Disc3, tile: 'bg-fuchsia-500/15 text-fuchsia-300' },
  { label: 'Metal', value: 'metal', icon: Flame, tile: 'bg-orange-500/15 text-orange-300' },
  { label: 'R&B', value: 'rnb', icon: Headphones, tile: 'bg-rose-500/15 text-rose-300' },
];

interface Props {
  view: DiscoveryView;
  onViewChange: (view: DiscoveryView) => void;
}

export function DiscoverySidebar({ view, onViewChange }: Props) {
  const { favorites, lists, activeTag, setActiveTag, setSearchQuery } = useStore();

  // Every sidebar choice leaves search mode so the selection is actually shown
  const go = (next: DiscoveryView) => {
    setSearchQuery('');
    onViewChange(next);
  };

  const selectGenre = (value: string) => {
    setActiveTag(activeTag === value && view === null ? null : value);
    go(null);
  };

  return (
    <nav aria-label="Library and filters" className="flex flex-col gap-7">
      <Section title="Library">
        <SidebarItem icon={Compass} label="Browse" active={view === null} onClick={() => go(null)} />
        <SidebarItem
          icon={Heart}
          label="Favorites"
          count={favorites.length}
          active={view === 'favorites'}
          onClick={() => go('favorites')}
        />
      </Section>

      <Section title="My Lists">
        {lists.map(list => (
          <SidebarItem
            key={list.id}
            icon={ListMusic}
            label={list.name}
            count={list.stations.length}
            active={view === list.id}
            onClick={() => go(list.id)}
          />
        ))}
        <NewListButton onCreated={go} />
      </Section>

      <Section title="Region">
        <CountrySelector onSelect={() => go(null)} />
      </Section>

      <Section title="Genres">
        {GENRES.map(genre => {
          const Icon = genre.icon;
          return (
            <SidebarItem
              key={genre.value}
              label={genre.label}
              active={view === null && activeTag === genre.value}
              onClick={() => selectGenre(genre.value)}
              leading={
                <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${genre.tile}`}>
                  <Icon size={14} strokeWidth={2.2} />
                </span>
              }
            />
          );
        })}
      </Section>
    </nav>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">{title}</h3>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

interface ItemProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  leading?: ReactNode;
  count?: number;
}

function SidebarItem({ label, active, onClick, icon: Icon, leading, count }: ItemProps) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13.5px] font-medium transition-colors ${
        active
          ? 'bg-accent/[0.14] text-white'
          : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" aria-hidden />}
      {leading ?? (Icon && (
        <Icon
          size={17}
          strokeWidth={active ? 2.3 : 2}
          className={active ? 'text-accent-glow' : 'text-white/45 group-hover:text-white/70'}
        />
      ))}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count != null && count > 0 && (
        <span className={`text-xs tabular-nums ${active ? 'text-accent-glow' : 'text-white/30'}`}>{count}</span>
      )}
    </button>
  );
}

function NewListButton({ onCreated }: { onCreated: (id: string) => void }) {
  const { createList } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const cancelled = useRef(false);

  // Enter and Escape both blur, so creation only ever runs here
  const finish = () => {
    const trimmed = name.trim();
    if (trimmed && !cancelled.current) onCreated(createList(trimmed));
    cancelled.current = false;
    setName('');
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="text"
        placeholder="List name..."
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={finish}
        onKeyDown={e => {
          if (e.key === 'Escape') cancelled.current = true;
          if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
        }}
        className="w-full rounded-xl border border-accent/60 bg-surface-card px-3 py-2 text-[13.5px] text-white placeholder-muted outline-none"
        maxLength={40}
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13.5px] font-medium text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white"
    >
      <span className="flex h-[17px] w-[17px] items-center justify-center rounded-md border border-dashed border-white/25">
        <Plus size={11} strokeWidth={2.4} />
      </span>
      New list
    </button>
  );
}
