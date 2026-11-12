import { useState, useMemo } from 'react';
import { Search, X, Globe, ChevronDown } from 'lucide-react';
import { useStore } from '../../../core/store/useStore';
import { useCountries } from '../hooks/useCountries';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { countryCodeToFlag } from '../../../shared/utils/countryFlag';

// Case- and accent-insensitive form for matching: "Turk" finds "Türkiye", "cote" finds "Côte d'Ivoire"
function foldText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Lives inside the scrolling sidebar, so the country list expands in place instead of
// floating as an absolutely positioned dropdown (which the scroll container would clip).
// The selected genre is kept, so country and genre combine (e.g. pop stations in Türkiye).
export function CountrySelector({ onSelect }: { onSelect?: (code: string | null) => void }) {
  const { selectedCountryCode, setSelectedCountryCode } = useStore();
  const { countries, isLoading } = useCountries();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return countries.slice(0, 30);
    const q = foldText(searchQuery.trim());
    return countries.filter(c => foldText(c.name).includes(q)).slice(0, 30);
  }, [countries, searchQuery]);

  const selectedCountry = countries.find(c => c.iso_3166_1 === selectedCountryCode);

  const handleSelect = (code: string | null) => {
    setSelectedCountryCode(code);
    setIsOpen(false);
    setSearchQuery('');
    onSelect?.(code);
  };

  return (
    <div>
      <div className="relative">
        <button
          onClick={() => setIsOpen(o => !o)}
          aria-expanded={isOpen}
          className={`flex w-full items-center gap-3 rounded-xl border py-2 pl-3 text-left text-[13.5px] font-medium transition-colors ${
            selectedCountryCode ? 'pr-9' : 'pr-3'
          } ${
            isOpen
              ? 'border-accent/40 bg-white/[0.06]'
              : 'border-white/[0.06] bg-white/[0.04] hover:border-white/[0.12] hover:bg-white/[0.06]'
          }`}
        >
          {selectedCountry ? (
            <>
              <span className="w-[17px] flex-shrink-0 text-center text-base leading-none">
                {countryCodeToFlag(selectedCountry.iso_3166_1)}
              </span>
              <span className="min-w-0 flex-1 truncate text-white">{selectedCountry.name}</span>
              <span className="text-xs tabular-nums text-white/35">{selectedCountry.stationcount}</span>
            </>
          ) : (
            <>
              <Globe size={17} className="flex-shrink-0 text-white/45" />
              <span className="flex-1 text-white/60">Worldwide</span>
              <ChevronDown
                size={15}
                className={`flex-shrink-0 text-white/35 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </>
          )}
        </button>

        {selectedCountryCode && (
          <button
            onClick={() => handleSelect(null)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/40 hover:bg-white/[0.06] hover:text-white"
            aria-label="Clear country filter"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-2 overflow-hidden rounded-xl border border-white/[0.06] bg-surface">
          <div className="border-b border-white/[0.06] p-2">
            <div className="flex items-center gap-2 rounded-lg bg-white/[0.05] px-2.5 py-1.5">
              <Search size={13} className="flex-shrink-0 text-muted" />
              <input
                type="text"
                placeholder="Search country..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setIsOpen(false); }}
                className="w-full bg-transparent text-[13px] text-white placeholder-muted outline-none"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            <button
              onClick={() => handleSelect(null)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/[0.05]"
            >
              <Globe size={15} className="text-muted" />
              <span className="text-[13px] text-white">Worldwide</span>
            </button>

            {isLoading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size={20} />
              </div>
            ) : (
              filtered.map(country => (
                <button
                  key={country.iso_3166_1}
                  onClick={() => handleSelect(country.iso_3166_1)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/[0.05] ${
                    selectedCountryCode === country.iso_3166_1 ? 'bg-white/[0.07]' : ''
                  }`}
                >
                  <span className="w-5 text-center text-base leading-none">{countryCodeToFlag(country.iso_3166_1)}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-white">{country.name}</span>
                  <span className="text-[11px] tabular-nums text-muted">{country.stationcount}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
