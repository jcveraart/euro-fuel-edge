import type { FuelStation, VehicleData } from './calculations';

const TANKERKOENIG_API_KEY = '201eeca2-d06c-4adc-ab5b-5bec8f5faf27';

export async function fetchRDWData(kenteken: string): Promise<Partial<VehicleData> | null> {
  try {
    const clean = kenteken.replace(/[-\s]/g, '').toUpperCase();
    const res = await fetch(
      `https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=${clean}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;

    const vehicle = data[0];
    return {
      kenteken: clean,
      merk: vehicle.merk || 'Onbekend',
      model: vehicle.handelsbenaming || 'Onbekend',
      brandstof: vehicle.brandstof_omschrijving || 'Benzine',
    };
  } catch {
    return null;
  }
}

export interface RDWFuelResult {
  brandstof: string | null;
  verbruik: number | null; // 1 op X km (combined, l/100km converted)
}

export async function fetchRDWFuel(kenteken: string): Promise<RDWFuelResult> {
  try {
    const clean = kenteken.replace(/[-\s]/g, '').toUpperCase();
    const res = await fetch(
      `https://opendata.rdw.nl/resource/8ys7-d773.json?kenteken=${clean}`
    );
    if (!res.ok) return { brandstof: null, verbruik: null };
    const data = await res.json();
    if (!data.length) return { brandstof: null, verbruik: null };

    const brandstof = data[0].brandstof_omschrijving || null;
    // brandstof_verbruik_gecombineerd is in l/100km, convert to "1 op X km"
    const lPer100 = parseFloat(data[0].brandstof_verbruik_gecombineerd);
    const verbruik = lPer100 > 0 ? Math.round((100 / lPer100) * 2) / 2 : null;

    return { brandstof, verbruik };
  } catch {
    return { brandstof: null, verbruik: null };
  }
}

// Fetch tank size from CarQuery API (free, no key needed)
// Falls back to static lookup if API fails (e.g. CORS blocked)
export async function fetchTankSize(merk: string, model: string): Promise<number | null> {
  // Normalize make name for CarQuery (RDW uses uppercase, e.g. "VOLKSWAGEN")
  const make = merk.toLowerCase().replace('mercedes-benz', 'mercedes').replace('bmw', 'bmw');
  // Use first word of model for broader matching (e.g. "POLO TSI" → "polo")
  const keyword = (model || '').toLowerCase().split(/[\s\/]/)[0];
  if (!make || !keyword) return fallbackTankSize(model);

  try {
    const res = await fetch(
      `https://www.carqueryapi.com/api/0.3/?cmd=getTrims&make=${encodeURIComponent(make)}&keyword=${encodeURIComponent(keyword)}&full_results=1`
    );
    if (!res.ok) return fallbackTankSize(model);
    const data = await res.json();
    const trims = data?.Trims;
    if (!Array.isArray(trims) || !trims.length) return fallbackTankSize(model);

    // Find the most common fuel capacity among trims
    for (const trim of trims) {
      const cap = parseFloat(trim.model_fuel_cap_l);
      if (cap > 0) return Math.round(cap);
    }
    return fallbackTankSize(model);
  } catch {
    return fallbackTankSize(model);
  }
}

// Fallback static lookup for when CarQuery is unavailable
const TANK_SIZE_MAP: Record<string, number> = {
  'POLO': 40, 'GOLF': 50, 'PASSAT': 66, 'TIGUAN': 58, 'T-ROC': 50, 'UP': 35,
  'CORSA': 44, 'ASTRA': 50, 'MOKKA': 44, 'CROSSLAND': 44, 'GRANDLAND': 53,
  'CLIO': 42, 'MEGANE': 50, 'CAPTUR': 48, 'KADJAR': 55, 'SCENIC': 55,
  '208': 44, '308': 53, '2008': 44, '3008': 53, '5008': 56,
  'C3': 45, 'C4': 50, 'C5': 53, 'BERLINGO': 50,
  'FIESTA': 42, 'FOCUS': 52, 'KUGA': 54, 'PUMA': 42,
  'IBIZA': 40, 'LEON': 50, 'ARONA': 40, 'ATECA': 50,
  'FABIA': 40, 'OCTAVIA': 50, 'KAROQ': 50, 'KODIAQ': 58,
  'A1': 40, 'A3': 50, 'A4': 54, 'A5': 54, 'A6': 63, 'Q3': 56, 'Q5': 65,
  '1 SERIE': 50, '2 SERIE': 50, '3 SERIE': 59, '5 SERIE': 68, 'X1': 51, 'X3': 65,
  'A-KLASSE': 43, 'B-KLASSE': 43, 'C-KLASSE': 66, 'E-KLASSE': 66, 'GLA': 43, 'GLB': 43,
  'YARIS': 36, 'COROLLA': 43, 'C-HR': 43, 'RAV4': 55, 'AYGO': 35,
  'SWIFT': 37, 'VITARA': 47, 'S-CROSS': 47,
  'SANDERO': 50, 'DUSTER': 50,
  'I10': 35, 'I20': 40, 'I30': 50, 'TUCSON': 54, 'KONA': 42,
  'PICANTO': 35, 'RIO': 45, 'CEED': 50, 'SPORTAGE': 54, 'NIRO': 43,
};

function fallbackTankSize(model: string): number | null {
  const m = (model || '').toUpperCase();
  for (const [key, size] of Object.entries(TANK_SIZE_MAP)) {
    if (m.includes(key)) return size;
  }
  return null;
}

// Haversine distance between two coordinates (km)
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function tankerkoenigFetch(url: string): Promise<any> {
  // Try direct, then CORS proxy fallback
  const attempts = [
    () => fetch(url, { signal: AbortSignal.timeout(7000) }),
    () => fetch(`https://corsproxy.io/?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(7000) }),
  ];
  for (const attempt of attempts) {
    try {
      const res = await attempt();
      if (!res.ok) continue;
      const raw = await res.json();
      // corsproxy wraps response in { contents: "..." }
      const data = typeof raw.contents === 'string' ? JSON.parse(raw.contents) : raw;
      if (data?.ok) return data;
    } catch {
      // try next
    }
  }
  console.error('Tankerkönig: all attempts failed');
  return null;
}

export async function fetchGermanStations(
  lat: number,
  lng: number,
  radius = 20,
  fuelType: 'e5' | 'e10' | 'diesel' = 'e5'
): Promise<FuelStation[]> {
  const url = `https://creativecommons.tankerkoenig.de/json/list.php?lat=${lat}&lng=${lng}&rad=${radius}&sort=dist&type=${fuelType}&apikey=${TANKERKOENIG_API_KEY}`;
  const data = await tankerkoenigFetch(url);
  if (!data?.stations) return [];
  return data.stations.map((s: any) => ({
    id: s.id, name: s.name, brand: s.brand,
    street: `${s.street} ${s.houseNumber || ''}`.trim(),
    place: s.place, lat: s.lat, lng: s.lng,
    e5: s.e5 || undefined, e10: s.e10 || undefined, diesel: s.diesel || undefined,
    dist: s.dist, isOpen: s.isOpen, country: 'DE' as const,
  }));
}

// Fetch from all border crossing points, deduplicate, recalculate dist from user
export async function fetchStationsForLocation(
  userLat: number, userLng: number,
  fuelType: 'e5' | 'e10' | 'diesel'
): Promise<FuelStation[]> {
  // Filter border points within 200km driving range
  const points = DE_BORDER_POINTS.filter(
    (p) => haversineKm(userLat, userLng, p.lat, p.lng) < 200
  );

  const batches = await Promise.all(
    points.map((p) => fetchGermanStations(p.lat, p.lng, 20, fuelType))
  );

  const seen = new Map<string, FuelStation>();
  for (const batch of batches) {
    for (const s of batch) {
      if (!seen.has(s.id)) {
        seen.set(s.id, {
          ...s,
          dist: Math.round(haversineKm(userLat, userLng, s.lat, s.lng) * 10) / 10,
        });
      }
    }
  }
  return Array.from(seen.values());
}

export interface GeocodeSuggestion {
  lat: number;
  lng: number;
  display: string;
}

export interface RouteData {
  coordinates: [number, number][]; // [lat, lng] pairs for Leaflet
  distanceKm: number;
  durationMin: number;
}

export async function fetchRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteData | null> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes?.length) return null;
    const route = data.routes[0];
    return {
      coordinates: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}

export async function geocodeSuggestions(
  query: string
): Promise<GeocodeSuggestion[]> {
  if (query.trim().length < 2) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=nl,de,be&limit=5&addressdetails=1`,
      { headers: { 'User-Agent': 'GrensTankerPro/1.0' } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data
      .map((d: any) => {
        const lat = parseFloat(d.lat);
        const lng = parseFloat(d.lon ?? d.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng, display: d.display_name as string };
      })
      .filter(Boolean) as GeocodeSuggestion[];
  } catch {
    return [];
  }
}

export async function geocodeAddress(
  query: string
): Promise<GeocodeSuggestion | null> {
  const results = await geocodeSuggestions(query);
  return results[0] ?? null;
}

// Default NL/BE prices (user-editable)
export const DEFAULT_PRICES = {
  nl: { e5: 2.15, e10: 2.09, diesel: 1.89 },
  be: { e5: 1.78, e10: 1.72, diesel: 1.69 },
};

// All Dutch-German border crossing points (north → south)
export const DE_BORDER_POINTS = [
  { name: 'Bunde',         lat: 53.180, lng: 7.230 },
  { name: 'Nieuweschans',  lat: 53.190, lng: 7.060 },
  { name: 'Ter Apel',      lat: 52.880, lng: 7.070 },
  { name: 'Coevorden',     lat: 52.660, lng: 6.750 },
  { name: 'Denekamp',      lat: 52.380, lng: 7.020 },
  { name: 'Oldenzaal',     lat: 52.310, lng: 7.000 },
  { name: 'Gronau',        lat: 52.210, lng: 7.020 },
  { name: 'Bad Bentheim',  lat: 52.300, lng: 7.160 },
  { name: 'Goch',          lat: 51.680, lng: 6.160 },
  { name: 'Kleve',         lat: 51.790, lng: 6.140 },
  { name: 'Emmerich',      lat: 51.830, lng: 6.250 },
  { name: 'Venlo',         lat: 51.370, lng: 6.170 },
  { name: 'Kaldenkirchen', lat: 51.320, lng: 6.200 },
  { name: 'Roermond-DE',   lat: 51.200, lng: 6.100 },
  { name: 'Aachen',        lat: 50.780, lng: 6.080 },
  { name: 'Vaals',         lat: 50.770, lng: 6.020 },
];
