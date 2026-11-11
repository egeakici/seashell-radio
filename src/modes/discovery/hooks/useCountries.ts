import { useState, useEffect } from 'react';
import type { Country } from '../../../core/types';
import { getCountries } from '../../../core/api/radioBrowser';

// Shared across every component that needs the country list (sidebar, selector, titles, map),
// so the API is hit once per page load instead of once per mounted component.
let cache: Country[] | null = null;
let pending: Promise<Country[]> | null = null;

function loadCountries(): Promise<Country[]> {
  if (cache) return Promise.resolve(cache);
  pending ??= getCountries()
    .then(data => (cache = data.filter(c => c.stationcount > 0 && c.name)))
    .finally(() => { pending = null; });
  return pending;
}

export function useCountries() {
  const [countries, setCountries] = useState<Country[]>(cache ?? []);
  const [isLoading, setIsLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    loadCountries()
      .then(data => { if (!cancelled) { setCountries(data); setIsLoading(false); } })
      .catch(() => { if (!cancelled) { setError('Failed to load countries.'); setIsLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  return { countries, isLoading, error };
}
