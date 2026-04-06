import type { FuelStation, VehicleData } from './calculations';

const TANKERKOENIG_API_KEY = '201eeca2-d06c-4adc-ab5b-5bec8f5faf27';

export async function fetchRDWData(kenteken: string): Promise<Partial<VehicleData> | null> {
  try {
    const clean = kenteken.replace(/[-\s]/g, '').toUpperCase();
    const res = await fetch(
      `https://opendata.rdw.nl/resource/m9gs-jnhu.json?kenteken=${clean}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;

    const vehicle = data[0];
    return {
      kenteken: clean,
      merk: vehicle.merk || 'Onbekend',
      model: vehicle.handelsbenaming || 'Onbekend',
      brandstof: vehicle.eerste_kleur || 'Benzine',
    };
  } catch {
    return null;
  }
}

export async function fetchRDWFuel(kenteken: string): Promise<string | null> {
  try {
    const clean = kenteken.replace(/[-\s]/g, '').toUpperCase();
    const res = await fetch(
      `https://opendata.rdw.nl/resource/8ys7-d773.json?kenteken=${clean}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return data[0].brandstof_omschrijving || null;
  } catch {
    return null;
  }
}

export async function fetchGermanStations(
  lat: number,
  lng: number,
  radius: number = 25,
  fuelType: 'e5' | 'e10' | 'diesel' = 'e5'
): Promise<FuelStation[]> {
  try {
    const res = await fetch(
      `https://creativecommons.tankerkoenig.de/json/list.php?lat=${lat}&lng=${lng}&rad=${radius}&sort=price&type=${fuelType}&apikey=${TANKERKOENIG_API_KEY}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.ok || !data.stations) return [];

    return data.stations
      .filter((s: any) => s.isOpen)
      .map((s: any) => ({
        id: s.id,
        name: s.name,
        brand: s.brand,
        street: `${s.street} ${s.houseNumber || ''}`.trim(),
        place: s.place,
        lat: s.lat,
        lng: s.lng,
        e5: s.e5 || undefined,
        e10: s.e10 || undefined,
        diesel: s.diesel || undefined,
        dist: s.dist,
        isOpen: s.isOpen,
        country: 'DE' as const,
      }));
  } catch {
    return [];
  }
}

export async function geocodeAddress(
  query: string
): Promise<{ lat: number; lng: number; display: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=nl,de,be&limit=1`,
      { headers: { 'User-Agent': 'GrensTankerPro/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lng),
      display: data[0].display_name,
    };
  } catch {
    return null;
  }
}

// Default NL/BE prices (user-editable)
export const DEFAULT_PRICES = {
  nl: { e5: 2.15, e10: 2.09, diesel: 1.89 },
  be: { e5: 1.78, e10: 1.72, diesel: 1.69 },
};

// Border crossing points for fetching stations
export const BORDER_POINTS = {
  de: [
    { name: 'Venlo', lat: 51.3704, lng: 6.1724 },
    { name: 'Aken/Aachen', lat: 50.7753, lng: 6.0839 },
    { name: 'Emmerich', lat: 51.8292, lng: 6.2453 },
    { name: 'Bad Bentheim', lat: 52.3036, lng: 7.1593 },
    { name: 'Gronau', lat: 52.2093, lng: 7.0246 },
    { name: 'Kleve', lat: 51.7879, lng: 6.1384 },
  ],
};
