import { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { SlidersHorizontal } from 'lucide-react';
import { useStore } from '../../core/store/useStore';
import { useCountries } from '../discovery/hooks/useCountries';
import { DiscoverySidebar, genreLabel, type DiscoveryView } from '../discovery/components/DiscoverySidebar';
import { SidebarLayout } from '../discovery/components/SidebarLayout';
import { COUNTRY_COORDS } from '../../shared/utils/countryCoords';
import { StationPanel, DEFAULT_HEIGHT as PANEL_HEIGHT_PERCENT } from './components/StationPanel';
import { NowPlayingBar } from '../../shared/components/NowPlayingBar';
import type { Country } from '../../core/types';

// Esri satellite imagery (no API key) with a transparent borders + place-names overlay on top
const IMAGERY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const LABELS_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const TILE_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

const WORLD_VIEW = { center: [30, 15] as [number, number], zoom: 3 };

// Only country center points are known (no borders), so big countries get a wider zoom by hand
const HUGE_COUNTRIES = new Set(['RU', 'CA', 'US', 'CN', 'BR', 'AU']);
const LARGE_COUNTRIES = new Set(['IN', 'AR', 'KZ', 'DZ', 'CD', 'SA', 'MX', 'ID', 'LY', 'SD', 'IR', 'MN', 'PE', 'GL', 'CL', 'NO']);

function countryZoom(code: string): number {
  return HUGE_COUNTRIES.has(code) ? 3 : LARGE_COUNTRIES.has(code) ? 4 : 5;
}

function markerRadius(stationCount: number): number {
  return Math.max(6, Math.log10(stationCount + 1) * 8);
}

interface FlyTarget {
  code: string;
  /** 'country': zoom to frame the country (picked in the sidebar); 'keep': just pan (marker click) */
  zoom: 'country' | 'keep';
  /** Bumped on every request, so picking the same country again still moves the map */
  seq: number;
}

// Moves the map to a country. Lives inside MapContainer to reach the Leaflet map.
function MapFocus({ target }: { target: FlyTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    const coords = COUNTRY_COORDS[target.code];
    if (!coords) return;

    const zoom = target.zoom === 'keep' ? map.getZoom() : countryZoom(target.code);
    // The station panel covers the bottom of the map — aim at the middle of what stays visible
    const shift = (map.getSize().y * PANEL_HEIGHT_PERCENT) / 100 / 2;
    const center = map.unproject(map.project(coords, zoom).add([0, shift]), zoom);
    map.flyTo(center, zoom, { duration: target.zoom === 'keep' ? 0.6 : 1.2 });
  }, [map, target]);

  return null;
}

export function MapMode() {
  const { countries } = useCountries();
  const { selectedCountryCode, setSelectedCountryCode, activeTag, setDiscoveryView, setMode } = useStore();
  const [panelOpen, setPanelOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // The region chosen in the sidebar is the map's selected country (shared with Discover)
  const selectedCountry = countries.find(c => c.iso_3166_1 === selectedCountryCode) ?? null;

  // Open on the selected country when arriving from Discover with one picked
  const [initialView] = useState(() => {
    const coords = selectedCountryCode ? COUNTRY_COORDS[selectedCountryCode] : undefined;
    return coords && selectedCountryCode ? { center: coords, zoom: countryZoom(selectedCountryCode) } : WORLD_VIEW;
  });

  // Close the panel if the country gets cleared some other way
  useEffect(() => {
    if (!selectedCountryCode) setPanelOpen(false);
  }, [selectedCountryCode]);

  const showCountry = (code: string, zoom: FlyTarget['zoom']) => {
    setPanelOpen(true);
    setFlyTarget(prev => ({ code, zoom, seq: (prev?.seq ?? 0) + 1 }));
  };

  const handleMarkerClick = (country: Country) => {
    setSelectedCountryCode(country.iso_3166_1);
    showCountry(country.iso_3166_1, 'keep');
  };

  const handleCountrySelect = (code: string | null) => {
    setDrawerOpen(false);
    if (code) showCountry(code, 'country');
    else setPanelOpen(false);
  };

  // A genre narrows the open country's stations; it stays in place on the map
  const handleGenreSelect = () => {
    setDrawerOpen(false);
    if (selectedCountryCode) setPanelOpen(true);
  };

  // Library items and lists are pages of Discover
  const handleViewChange = (view: DiscoveryView) => {
    setDiscoveryView(view);
    setMode('discovery');
  };

  const hasActiveFilter = !!selectedCountryCode || !!activeTag;

  return (
    <SidebarLayout
      sidebar={
        <DiscoverySidebar
          view={undefined}
          onViewChange={handleViewChange}
          onCountrySelect={handleCountrySelect}
          onGenreSelect={handleGenreSelect}
        />
      }
      drawerOpen={drawerOpen}
      onCloseDrawer={closeDrawer}
    >
      {/* Map panel — the station panel and now-playing bar are positioned inside it */}
      <section className="relative min-w-0 flex-1 overflow-hidden lg:rounded-2xl lg:border lg:border-white/[0.04]">
        <MapContainer
          center={initialView.center}
          zoom={initialView.zoom}
          minZoom={2}
          maxZoom={12}
          style={{ height: '100%', width: '100%', background: '#0f0e14' }}
          zoomControl={false}
        >
          <TileLayer url={IMAGERY_URL} attribution={TILE_ATTRIBUTION} maxNativeZoom={18} />
          <TileLayer url={LABELS_URL} maxNativeZoom={18} opacity={0.85} />

          <ZoomControl position="bottomright" />
          <MapFocus target={flyTarget} />

          {countries.map(country => {
            const coords = COUNTRY_COORDS[country.iso_3166_1];
            if (!coords) return null;

            const isSelected = selectedCountryCode === country.iso_3166_1;
            const radius = markerRadius(country.stationcount);

            return (
              <CircleMarker
                key={country.iso_3166_1}
                center={coords}
                radius={isSelected ? radius + 5 : radius}
                pathOptions={{
                  // White outline keeps markers readable over bright satellite imagery
                  color: '#ffffff',
                  fillColor: isSelected ? '#d4cdfb' : '#a99cf6',
                  fillOpacity: isSelected ? 0.9 : 0.5,
                  weight: isSelected ? 3 : 1.5,
                }}
                eventHandlers={{
                  click: () => handleMarkerClick(country),
                }}
              >
                <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
                  <span className="text-xs font-medium">
                    {country.name} · {country.stationcount}
                  </span>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Library & filters — below the desktop breakpoint the sidebar is a drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="absolute left-3 top-3 z-[500] flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-white/[0.08] bg-[rgba(35,34,44,0.85)] text-white/70 backdrop-blur-md transition-colors hover:text-white lg:hidden"
          aria-label="Open library and filters"
        >
          <SlidersHorizontal size={17} />
          {hasActiveFilter && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
        </button>

        {!panelOpen && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-[500] -translate-x-1/2">
            <div className="whitespace-nowrap rounded-full border border-white/[0.08] bg-[rgba(35,34,44,0.8)] px-3 py-1.5 text-xs text-white/75 backdrop-blur-md">
              {activeTag ? `Tap a country → ${genreLabel(activeTag)} stations` : 'Tap a country → see radio stations'}
            </div>
          </div>
        )}

        {panelOpen && selectedCountry && (
          <StationPanel country={selectedCountry} onClose={() => setPanelOpen(false)} />
        )}

        <NowPlayingBar />
      </section>
    </SidebarLayout>
  );
}
