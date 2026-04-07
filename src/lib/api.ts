import type { FuelStation, VehicleData } from './calculations';

const TANKERKOENIG_API_KEY = '201eeca2-d06c-4adc-ab5b-5bec8f5faf27';
const ORS_API_KEY = '5b3ce3597851110001cf62488d691c9c01af4b5eb8f13165b19c9ee8';

// ── RDW ────────────────────────────────────────────────────────────

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
  verbruik: number | null;
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
    const lPer100 = parseFloat(data[0].brandstof_verbruik_gecombineerd);
    const verbruik = lPer100 > 0 ? Math.round((100 / lPer100) * 2) / 2 : null;

    return { brandstof, verbruik };
  } catch {
    return { brandstof: null, verbruik: null };
  }
}

// ── Tank Size ──────────────────────────────────────────────────────

export async function fetchTankSize(merk: string, model: string): Promise<number | null> {
  const make = merk.toLowerCase().replace('mercedes-benz', 'mercedes').replace('bmw', 'bmw');
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

    for (const trim of trims) {
      const cap = parseFloat(trim.model_fuel_cap_l);
      if (cap > 0) return Math.round(cap);
    }
    return fallbackTankSize(model);
  } catch {
    return fallbackTankSize(model);
  }
}

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

// ── Haversine ──────────────────────────────────────────────────────

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── NL-DE Border Crossings (south → north) ────────────────────────

export const BORDER_CROSSINGS = [
  { name: 'Maasbracht/Linne (N271)',        lat: 51.1530, lng: 5.9050 },
  { name: 'Swalmen/Roermond (A73)',          lat: 51.1950, lng: 6.0350 },
  { name: 'Venlo/Kaldenkirchen (A67)',       lat: 51.3702, lng: 6.1759 },
  { name: 'Venlo/Straelen (N271)',           lat: 51.4150, lng: 6.1620 },
  { name: 'Goch/Gennep (N271)',             lat: 51.6891, lng: 5.9891 },
  { name: 'Nijmegen/Kranenburg (B9)',        lat: 51.7982, lng: 5.9855 },
  { name: 'Zevenaar/Emmerich (A12)',         lat: 51.9213, lng: 6.0951 },
  { name: 'Didam/Anholt (N316)',             lat: 51.8650, lng: 6.3710 },
  { name: 'Doetinchem/Bocholt (N18)',        lat: 51.9127, lng: 6.5542 },
  { name: 'Groenlo/Vreden (N18)',            lat: 51.9490, lng: 6.6790 },
  { name: 'Winterswijk/Vreden (N319)',       lat: 51.9744, lng: 6.7241 },
  { name: 'Winterswijk/Bocholt (N315)',      lat: 51.9210, lng: 6.7530 },
  { name: 'Haaksbergen/Gronau (N350)',       lat: 52.1490, lng: 6.9650 },
  { name: 'Enschede/Gronau (N35)',           lat: 52.2113, lng: 7.0059 },
  { name: 'Oldenzaal/Gronau (A35)',          lat: 52.3038, lng: 7.0188 },
  { name: 'De Lutte/Schüttorf (N343)',       lat: 52.3882, lng: 7.0275 },
  { name: 'Hardenberg/Neuenhaus (N36)',      lat: 52.5188, lng: 6.8693 },
  { name: 'Coevorden/Emlichheim (N34)',      lat: 52.5979, lng: 6.8029 },
  { name: 'Emmen/Meppen (A37)',              lat: 52.6548, lng: 6.7413 },
  { name: 'Stadskanaal/Zwartemeer (N374)',   lat: 52.7850, lng: 6.9850 },
  { name: 'Ter Apel/Twist (N366)',           lat: 52.8723, lng: 7.0714 },
  { name: 'Bourtange/Papenburg (N365)',      lat: 53.0100, lng: 7.1750 },
  { name: 'Nieuw Statenzijl/Bunde (N33)',    lat: 53.2308, lng: 7.1875 },
];

// ── Routing via OpenRouteService ───────────────────────────────────

export interface RouteData {
  coordinates: [number, number][]; // [lat, lng] for Leaflet
  distanceKm: number;
  durationMin: number;
}

export async function fetchRoute(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number
): Promise<RouteData | null> {
  try {
    const res = await fetch(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      {
        method: 'POST',
        headers: {
          'Authorization': ORS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: [[fromLng, fromLat], [toLng, toLat]],
          instructions: false,
        }),
        signal: AbortSignal.timeout(30000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.features?.length) return null;
    const f = data.features[0];
    return {
      coordinates: f.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
      ),
      distanceKm: Math.round(f.properties.summary.distance / 100) / 10,
      durationMin: Math.round(f.properties.summary.duration / 60),
    };
  } catch {
    return null;
  }
}

// ── Station Fetching (Tankerkönig, direct) ─────────────────────────

export async function fetchGermanStations(
  lat: number, lng: number,
  radius = 10,
  fuelType: 'e5' | 'e10' | 'diesel' | 'all' = 'all'
): Promise<FuelStation[]> {
  try {
    const res = await fetch(
      `https://creativecommons.tankerkoenig.de/json/list.php?lat=${lat}&lng=${lng}&rad=${radius}&type=${fuelType}&sort=dist&apikey=${TANKERKOENIG_API_KEY}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.ok) return [];
    return (data.stations || [])
      .filter((s: any) => s.e5 != null || s.e10 != null || s.diesel != null)
      .map((s: any) => ({
        id: s.id, name: s.name, brand: s.brand,
        street: `${s.street} ${s.houseNumber || ''}`.trim(),
        place: s.place, lat: s.lat, lng: s.lng,
        e5: s.e5 || undefined, e10: s.e10 || undefined, diesel: s.diesel || undefined,
        dist: s.dist, isOpen: s.isOpen, country: 'DE' as const,
      }));
  } catch {
    return [];
  }
}

// ── Main Pipeline ─────────────────────────────────────────────────

interface CrossingRoute {
  crossing: (typeof BORDER_CROSSINGS)[number];
  route: RouteData;
}

export interface StationOption {
  station: FuelStation;
  crossing: CrossingRoute;
}

/**
 * Step 1: Fetch crossings + stations (expensive — call on location change only).
 * Routes to closest border crossings via ORS, picks top 3 fastest,
 * then fetches Tankerkönig stations near each crossing.
 */
export async function fetchCrossingsAndStations(
  userLat: number, userLng: number,
  onProgress?: (msg: string) => void,
): Promise<StationOption[]> {
  // Sort crossings by haversine, take closest 6
  const closest = BORDER_CROSSINGS
    .map(c => ({ ...c, hDist: haversineKm(userLat, userLng, c.lat, c.lng) }))
    .sort((a, b) => a.hDist - b.hDist)
    .slice(0, 6);

  onProgress?.('Routes naar grensovergangen berekenen...');

  // Route to 6 crossings via ORS (parallel)
  const crossingResults = await Promise.all(
    closest.map(async (c) => {
      const route = await fetchRoute(userLat, userLng, c.lat, c.lng);
      return route ? { crossing: c, route } as CrossingRoute : null;
    })
  );

  // Take top 3 by drive time
  const top3Crossings = crossingResults
    .filter((x): x is CrossingRoute => x !== null)
    .sort((a, b) => a.route.durationMin - b.route.durationMin)
    .slice(0, 3);

  if (!top3Crossings.length) return [];

  onProgress?.('Tankstations ophalen bij grensovergangen...');

  // Fetch stations near top 3 crossings (parallel, type=all for all fuel prices)
  const batches = await Promise.all(
    top3Crossings.map(async (cr) => {
      const stations = await fetchGermanStations(cr.crossing.lat, cr.crossing.lng, 10, 'all');
      return stations.map(s => ({ station: s, crossing: cr } as StationOption));
    })
  );

  // Deduplicate: keep station from the fastest crossing
  const seen = new Map<string, StationOption>();
  for (const batch of batches) {
    for (const opt of batch) {
      const existing = seen.get(opt.station.id);
      if (!existing || opt.crossing.route.durationMin < existing.crossing.route.durationMin) {
        seen.set(opt.station.id, opt);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Step 2: Rank stations by net savings (pure function, instant).
 * Re-run when fuel type, tank level, consumption, or prices change.
 *
 * Net savings formula (from working script):
 *   fuel_at_crossing = currentLiters - (dHomeCrossing / 100 * fuelUseL100)
 *   fuel_at_station  = fuel_at_crossing - (dCrossingStation / 100 * fuelUseL100)
 *   liters_bought    = tankSize - fuel_at_station
 *   savings          = liters_bought * (nlPrice - dePrice)
 *   trip_cost        = (2*dHomeCrossing + 2*dCrossingStation) / 100 * fuelUseL100 * nlPrice
 *   net              = savings - trip_cost
 */
export interface RankedResult {
  station: FuelStation;
  crossingName: string;
  distHomeCrossingKm: number;
  durationHomeCrossingMin: number;
  distCrossingStationKm: number;
  routeHomeToCrossing: [number, number][];
  crossingLat: number;
  crossingLng: number;
  netSavings: number;
  litersBought: number;
  dePrice: number;
}

export function rankStations(
  options: StationOption[],
  fuelType: 'e5' | 'e10' | 'diesel',
  fuelUseL100: number,
  currentLiters: number,
  tankSize: number,
  nlPrice: number,
): RankedResult[] {
  const results: RankedResult[] = [];

  for (const opt of options) {
    const price = opt.station[fuelType];
    if (!price) continue;

    const dHomeCrossing = opt.crossing.route.distanceKm;
    const fuelAtCrossing = currentLiters - (dHomeCrossing / 100 * fuelUseL100);
    if (fuelAtCrossing < 0) continue; // can't reach this crossing

    const dCrossingStation = haversineKm(
      opt.crossing.crossing.lat, opt.crossing.crossing.lng,
      opt.station.lat, opt.station.lng
    );

    const fuelAtStation = Math.max(fuelAtCrossing - (dCrossingStation / 100 * fuelUseL100), 0);
    const litersBought = Math.min(tankSize - fuelAtStation, tankSize);
    const savings = litersBought * (nlPrice - price);
    const tripCost = (2 * dHomeCrossing + 2 * dCrossingStation) / 100 * fuelUseL100 * nlPrice;
    const netSavings = savings - tripCost;

    results.push({
      station: {
        ...opt.station,
        dist: Math.round((dHomeCrossing + dCrossingStation) * 10) / 10,
      },
      crossingName: opt.crossing.crossing.name,
      distHomeCrossingKm: dHomeCrossing,
      durationHomeCrossingMin: opt.crossing.route.durationMin,
      distCrossingStationKm: Math.round(dCrossingStation * 10) / 10,
      routeHomeToCrossing: opt.crossing.route.coordinates,
      crossingLat: opt.crossing.crossing.lat,
      crossingLng: opt.crossing.crossing.lng,
      netSavings,
      litersBought,
      dePrice: price,
    });
  }

  return results.sort((a, b) => b.netSavings - a.netSavings).slice(0, 5);
}

// ── Geocoding (unchanged) ──────────────────────────────────────────

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

// ── Default Prices ─────────────────────────────────────────────────

export const DEFAULT_PRICES = {
  nl: { e5: 2.792, e10: 2.598, diesel: 2.810 },
  be: { e5: 1.78, e10: 1.72, diesel: 1.69 },
};
