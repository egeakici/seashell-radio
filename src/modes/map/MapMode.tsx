import { useState } from 'react';
import { useStore } from '../../core/store/useStore';
import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useCountries } from '../discovery/hooks/useCountries';
import { COUNTRY_COORDS } from '../../shared/utils/countryCoords';
import { StationPanel } from './components/StationPanel';
import { NowPlayingBar } from '../../shared/components/NowPlayingBar';
import type { Country } from '../../core/types';

// Esri satellite imagery (no API key) with a transparent borders + place-names overlay on top
const IMAGERY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const LABELS_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const TILE_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

function markerRadius(stationCount: number): number {
  return Math.max(6, Math.log10(stationCount + 1) * 8);
}

export function MapMode() {
  const { countries } = useCountries();
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const setMapPanelOpen = useStore(s => s.setMapPanelOpen);

  const handleSelectCountry = (country: Country) => {
    setSelectedCountry(country);
    setMapPanelOpen(true);
  };

  const handleClosePanel = () => {
    setSelectedCountry(null);
    setMapPanelOpen(false);
  };

  return (
    <div className="h-full lg:px-3 lg:pb-3 xl:px-5">
      <div className="relative mx-auto h-full max-w-[1624px] overflow-hidden lg:rounded-2xl lg:border lg:border-white/[0.04]">
        <MapContainer
          center={[30, 15]}
          zoom={3}
          minZoom={2}
          maxZoom={12}
          style={{ height: '100%', width: '100%', background: '#0f0e14' }}
          zoomControl={false}
        >
          <TileLayer url={IMAGERY_URL} attribution={TILE_ATTRIBUTION} maxNativeZoom={18} />
          <TileLayer url={LABELS_URL} maxNativeZoom={18} opacity={0.85} />

          <ZoomControl position="bottomright" />

          {countries.map(country => {
            const coords = COUNTRY_COORDS[country.iso_3166_1];
            if (!coords) return null;

            const isSelected = selectedCountry?.iso_3166_1 === country.iso_3166_1;
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
                  click: () => handleSelectCountry(country),
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

        {!selectedCountry && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-[500] -translate-x-1/2">
            <div className="rounded-full border border-white/[0.08] bg-[rgba(35,34,44,0.8)] px-3 py-1.5 text-xs text-white/75 backdrop-blur-md">
              Tap a country → see radio stations
            </div>
          </div>
        )}

        {selectedCountry && (
          <StationPanel
            country={selectedCountry}
            onClose={handleClosePanel}
          />
        )}

        <NowPlayingBar />
      </div>
    </div>
  );
}
