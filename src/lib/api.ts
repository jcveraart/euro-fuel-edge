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

// Estimated tank sizes (liters) by make + model keyword
const TANK_SIZE_MAP: Record<string, number> = {
  'POLO': 40, 'GOLF': 50, 'PASSAT': 66, 'TIGUAN': 58, 'T-ROC': 50, 'ID.3': 0, 'ID.4': 0, 'UP': 35,
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
  'SANDERO': 50, 'DUSTER': 50, 'SPRING': 0,
  'I10': 35, 'I20': 40, 'I30': 50, 'TUCSON': 54, 'KONA': 42,
  'PICANTO': 35, 'RIO': 45, 'CEED': 50, 'SPORTAGE': 54, 'NIRO': 43,
};

export function estimateTankSize(merk: string, model: string): number | null {
  const m = (model || '').toUpperCase();
  for (const [key, size] of Object.entries(TANK_SIZE_MAP)) {
    if (m.includes(key)) return size;
  }
  return null;
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

export interface GeocodeSuggestion {
  lat: number;
  lng: number;
  display: string;
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
