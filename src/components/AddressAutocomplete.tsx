import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, LocateFixed } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { geocodeSuggestions, type GeocodeSuggestion } from '@/lib/api';

interface AddressAutocompleteProps {
  onSelect: (loc: { lat: number; lng: number; display: string }) => void;
}

export function AddressAutocomplete({ onSelect }: AddressAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse geocode to get a display name
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'User-Agent': 'GrensTankerPro/1.0' } }
          );
          const data = await res.json();
          const display = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          const short = display.split(',').slice(0, 2).join(',');
          setQuery(short.trim());
          onSelect({ lat: latitude, lng: longitude, display });
        } catch {
          setQuery(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          onSelect({ lat: latitude, lng: longitude, display: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
        }
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onSelect]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const results = await geocodeSuggestions(q);
    setSuggestions(results);
    setOpen(results.length > 0);
    setLoading(false);
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 350);
  };

  const handleSelect = (s: GeocodeSuggestion) => {
    setQuery(s.display.split(',').slice(0, 2).join(','));
    setOpen(false);
    setSuggestions([]);
    onSelect(s);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Bijv. Maastricht of 6211"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            className="pr-8 text-sm"
          />
          {loading && (
            <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={useMyLocation}
          disabled={geoLoading}
          title="Gebruik mijn locatie"
        >
          {geoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
        </Button>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          {suggestions.map((s, i) => {
            const parts = s.display.split(',');
            const main = parts.slice(0, 2).join(',');
            const sub = parts.slice(2, 4).join(',');
            return (
              <button
                key={i}
                onClick={() => handleSelect(s)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus:bg-accent"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{main.trim()}</p>
                  {sub && (
                    <p className="truncate text-xs text-muted-foreground">{sub.trim()}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
