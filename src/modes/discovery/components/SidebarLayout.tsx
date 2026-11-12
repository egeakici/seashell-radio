import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  /** Rendered as the left panel on desktop and inside the drawer on phones/tablets */
  sidebar: ReactNode;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  /** The main panel next to the sidebar (the mode styles its own section) */
  children: ReactNode;
}

// Shared page frame for Discover and Map: library/filters panel on the left, content on the right.
export function SidebarLayout({ sidebar, drawerOpen, onCloseDrawer, children }: Props) {
  // Close the drawer with Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseDrawer(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, onCloseDrawer]);

  return (
    <div className="h-full lg:px-3 lg:pb-3 xl:px-5">
      <div className="mx-auto flex h-full max-w-[1624px] gap-3">
        {/* Sidebar panel — desktop */}
        <aside className="hidden w-64 flex-shrink-0 overflow-y-auto rounded-2xl border border-white/[0.04] bg-panel px-3 py-5 lg:block xl:w-72">
          {sidebar}
        </aside>

        {children}
      </div>

      {/* Sidebar — drawer below the desktop breakpoint */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[1300] lg:hidden" role="dialog" aria-modal="true" aria-label="Library and filters">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCloseDrawer} />
          <div
            className="animate-slide-in-left absolute inset-y-0 left-0 w-[290px] max-w-[85vw] overflow-y-auto overscroll-contain border-r border-white/[0.06] bg-panel px-3 pb-10 pt-5"
            style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
          >
            <div className="mb-5 flex items-center justify-between px-3">
              <span className="text-sm font-semibold text-white">Library & Filters</span>
              <button
                onClick={onCloseDrawer}
                className="rounded-lg p-1.5 text-white/50 hover:bg-white/[0.06] hover:text-white"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
}
