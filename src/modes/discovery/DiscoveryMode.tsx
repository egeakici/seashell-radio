import { useEffect, useState } from 'react';
import { Search, X, Heart, ListMusic, Trash2, SlidersHorizontal, History } from 'lucide-react';
import { useStore } from '../../core/store/useStore';
import type { StationList as CustomList } from '../../core/types';
import { DiscoverySidebar, type DiscoveryView } from './components/DiscoverySidebar';
import { StationList, StationListView, TrendingList } from './components/StationList';
import { NowPlayingBar } from '../../shared/components/NowPlayingBar';

export function DiscoveryMode() {
  const { searchQuery, setSearchQuery, lists, selectedCountryCode, activeTag } = useStore();
  const [view, setView] = useState<DiscoveryView>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeList = lists.find(l => l.id === view);
  const hasActiveFilter = view !== null || !!selectedCountryCode || !!activeTag;

  // Fall back to browsing if the selected list gets deleted
  useEffect(() => {
    const isLibraryView = view === null || view === 'trending' || view === 'recent' || view === 'favorites';
    if (!isLibraryView && !activeList) setView(null);
  }, [view, activeList]);

  // Close the mobile drawer with Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    // Search results replace whatever library view was open
    if (q && view !== null) setView(null);
  };

  const handleViewChange = (next: DiscoveryView) => {
    setView(next);
    setDrawerOpen(false);
  };

  return (
    <div className="h-full px-0 lg:px-6 xl:px-8">
      <div className="mx-auto flex h-full max-w-[1600px]">
        {/* Sidebar — desktop */}
        <aside className="hidden w-64 flex-shrink-0 overflow-y-auto border-r border-white/[0.06] py-6 pb-10 pr-5 lg:block xl:w-72">
          <DiscoverySidebar view={view} onViewChange={handleViewChange} />
        </aside>

        {/* Content column — positioned so the now-playing bar centers on it, not on the screen */}
        <section className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 px-4 pb-3 pt-4 lg:px-8 lg:pt-6">
            <button
              onClick={() => setDrawerOpen(true)}
              className="relative flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/60 transition-colors hover:text-white lg:hidden"
              aria-label="Open library and filters"
            >
              <SlidersHorizontal size={17} />
              {hasActiveFilter && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
            </button>

            <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-2.5 transition-colors focus-within:border-accent/40 focus-within:bg-white/[0.04]">
              <Search size={16} className="flex-shrink-0 text-white/40" />
              <input
                type="text"
                placeholder="Search stations..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/35 outline-none"
              />
              {searchQuery && (
                <button onClick={() => handleSearch('')} className="text-white/40 hover:text-white" aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-32 lg:px-8">
            {view === 'trending' ? (
              <TrendingList />
            ) : view === 'recent' ? (
              <RecentlyPlayedList />
            ) : view === 'favorites' ? (
              <FavoritesList />
            ) : activeList ? (
              <CustomListView list={activeList} />
            ) : (
              <StationList />
            )}
          </div>

          <NowPlayingBar placement="container" />
        </section>
      </div>

      {/* Sidebar — mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[1300] lg:hidden" role="dialog" aria-modal="true" aria-label="Library and filters">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="animate-slide-in-left absolute inset-y-0 left-0 w-[290px] max-w-[85vw] overflow-y-auto border-r border-white/[0.08] bg-surface px-4 pb-10 pt-5">
            <div className="mb-5 flex items-center justify-between px-3">
              <span className="text-sm font-semibold text-white">Library & Filters</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-white/50 hover:bg-white/[0.06] hover:text-white"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <DiscoverySidebar view={view} onViewChange={handleViewChange} />
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }: { icon: typeof Heart; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Icon size={32} className="text-muted" />
      <p className="text-sm text-muted">{title}</p>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}

function RecentlyPlayedList() {
  const { recentlyPlayed, clearRecentlyPlayed } = useStore();

  return (
    <StationListView
      title="Recently Played"
      stations={recentlyPlayed}
      actions={recentlyPlayed.length > 0 && (
        <button
          onClick={clearRecentlyPlayed}
          className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-red-400"
        >
          <Trash2 size={13} />
          Clear
        </button>
      )}
      empty={<EmptyState icon={History} title="Nothing played yet." hint="Stations you listen to will show up here." />}
    />
  );
}

function FavoritesList() {
  const { favorites } = useStore();

  return (
    <StationListView
      title="Favorites"
      stations={favorites}
      empty={<EmptyState icon={Heart} title="No favorites yet." hint="Tap the heart icon on a station to add it to favorites." />}
    />
  );
}

function CustomListView({ list }: { list: CustomList }) {
  const { deleteList } = useStore();

  const handleDelete = () => {
    if (window.confirm(`Delete the list "${list.name}"?`)) deleteList(list.id);
  };

  return (
    <StationListView
      title={list.name}
      stations={list.stations}
      actions={
        <button
          onClick={handleDelete}
          className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-red-400"
          aria-label={`Delete list ${list.name}`}
        >
          <Trash2 size={13} />
          Delete
        </button>
      }
      empty={<EmptyState icon={ListMusic} title="This list is empty." hint="Use the list icon on a station card to add it here." />}
    />
  );
}
