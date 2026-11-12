import { useRef, useState, type ReactNode } from 'react';
import {
  AudioWaveform, Compass, Disc3, Flame, Guitar, Headphones, Heart, History, ListMusic,
  MessageCircle, MicVocal, Music, Music2, Newspaper, Piano, Plus, Trees, TrendingUp, type LucideIcon,
} from 'lucide-react';
import { useStore } from '../../../core/store/useStore';
import { useCountries } from '../hooks/useCountries';
import { CountrySelector } from './CountrySelector';

// null = browse, a library view, or a custom list id
export type DiscoveryView = null | 'trending' | 'recent' | 'favorites' | string;

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

/** Display name for a genre tag value, e.g. 'hiphop' → 'Hip-Hop' */
export function genreLabel(value: string): string {
  return GENRES.find(g => g.value === value)?.label ?? value.charAt(0).toUpperCase() + value.slice(1);
}

interface Props {
  /** Highlighted library view; undefined when the sidebar sits next to the map */
  view: DiscoveryView | undefined;
  onViewChange: (view: DiscoveryView) => void;
  /**
   * Region and genre are filters. By default picking one shows the browse list;
   * next to the map they are handled in place instead.
   */
  onCountrySelect?: (code: string | null) => void;
  onGenreSelect?: (tag: string | null) => void;
}

export function DiscoverySidebar({ view, onViewChange, onCountrySelect, onGenreSelect }: Props) {
  const { favorites, lists, activeTag, setActiveTag, setSearchQuery, selectedCountryCode } = useStore();
  const { countries } = useCountries();
  const selectedCountry = countries.find(c => c.iso_3166_1 === selectedCountryCode);

  // Every sidebar choice leaves search mode so the selection is actually shown
  const go = (next: DiscoveryView) => {
    setSearchQuery('');
    onViewChange(next);
  };

  // view == null: browsing (null) or next to the map (undefined) — where genres act as a filter
  const selectGenre = (value: string) => {
    const next = activeTag === value && view == null ? null : value;
    setActiveTag(next);
    if (onGenreSelect) onGenreSelect(next);
    else go(null);
  };

  const selectCountry = (code: string | null) => {
    if (onCountrySelect) onCountrySelect(code);
    else go(null);
  };

  return (
    <nav aria-label="Library and filters" className="flex flex-col gap-7">
      <Section title="Library">
        <SidebarItem icon={Compass} iconClass="text-accent-glow" label="Browse" active={view === null} onClick={() => go(null)} />
        <SidebarItem icon={TrendingUp} iconClass="text-amber-300" label="Trending" active={view === 'trending'} onClick={() => go('trending')} />
        <SidebarItem icon={History} iconClass="text-sky-300" label="Recently Played" active={view === 'recent'} onClick={() => go('recent')} />
        <SidebarItem
          icon={Heart}
          iconClass="text-pink-300"
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
            iconClass="text-white/80"
            label={list.name}
            count={list.stations.length}
            active={view === list.id}
            onClick={() => go(list.id)}
          />
        ))}
        <NewListButton onCreated={go} />
      </Section>

      <Section title="Region">
        <CountrySelector onSelect={selectCountry} />
      </Section>

      <Section title="Genres" hint={selectedCountry ? `In ${selectedCountry.name}` : undefined}>
        {GENRES.map(genre => {
          const Icon = genre.icon;
          return (
            <SidebarItem
              key={genre.value}
              label={genre.label}
              active={view == null && activeTag === genre.value}
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

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2 px-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">{title}</h3>
        {hint && <span className="truncate text-[11px] font-medium text-live/80">{hint}</span>}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

interface ItemProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  /** Icon color while the item is active; inactive icons stay neutral */
  iconClass?: string;
  leading?: ReactNode;
  count?: number;
}

function SidebarItem({ label, active, onClick, icon: Icon, iconClass = 'text-accent-glow', leading, count }: ItemProps) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13.5px] font-medium transition-colors ${
        active
          ? 'bg-white/[0.07] text-white'
          : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" aria-hidden />}
      {leading ?? (Icon && (
        <Icon
          size={17}
          strokeWidth={2}
          className={active ? iconClass : 'text-white/40 transition-colors group-hover:text-white/70'}
        />
      ))}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count != null && count > 0 && (
        <span className={`rounded-md px-1.5 py-px text-[11px] tabular-nums ${active ? 'bg-white/[0.08] text-white/80' : 'text-white/30'}`}>
          {count}
        </span>
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
        className="w-full rounded-xl border border-accent/50 bg-white/[0.05] px-3 py-2 text-[13.5px] text-white placeholder-muted outline-none"
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
