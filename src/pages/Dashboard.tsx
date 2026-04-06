import { useState, useEffect, useCallback } from 'react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { FuelMap } from '@/components/FuelMap';
import { fetchGermanStations, DEFAULT_PRICES, BORDER_POINTS } from '@/lib/api';
import type { FuelStation, VehicleData } from '@/lib/calculations';
import { calculateNetProfit } from '@/lib/calculations';

export default function Dashboard() {
  const [vehicle, setVehicle] = useState<VehicleData>({
    kenteken: '',
    merk: 'Onbekend',
    model: 'Onbekend',
    brandstof: 'Benzine',
    verbruik: 15,
    tankinhoud: 50,
  });
  const [fuelType, setFuelType] = useState<'e5' | 'e10' | 'diesel'>('e5');
  const [nlPrice, setNlPrice] = useState(DEFAULT_PRICES.nl.e5);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; display: string } | null>(null);
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [loading, setLoading] = useState(false);

  // Update NL price when fuel type changes
  useEffect(() => {
    setNlPrice(DEFAULT_PRICES.nl[fuelType]);
  }, [fuelType]);

  // Fetch stations from border points
  const loadStations = useCallback(async () => {
    setLoading(true);
    try {
      const allStations: FuelStation[] = [];
      const fetches = BORDER_POINTS.de.map((p) =>
        fetchGermanStations(p.lat, p.lng, 15, fuelType)
      );
      const results = await Promise.all(fetches);
      results.forEach((r) => allStations.push(...r));

      // Deduplicate by id
      const unique = Array.from(new Map(allStations.map((s) => [s.id, s])).values());
      setStations(unique);
    } catch {
      console.error('Failed to load stations');
    }
    setLoading(false);
  }, [fuelType]);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  // Calculate best profit
  const bestResult = stations.reduce<{ profit: number; name: string } | null>((best, s) => {
    const price = s[fuelType];
    if (!price) return best;
    const dist = s.dist || 10;
    const profit = calculateNetProfit(nlPrice, price, vehicle.tankinhoud, dist, vehicle.verbruik);
    if (!best || profit > best.profit) {
      return { profit, name: `${s.brand || s.name} - ${s.place}` };
    }
    return best;
  }, null);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] pt-14">
      {/* Sidebar */}
      <div className="w-80 shrink-0 border-r border-border bg-card/50 backdrop-blur-sm lg:w-96">
        <DashboardSidebar
          vehicle={vehicle}
          onVehicleChange={setVehicle}
          onLocationChange={(loc) => setUserLocation(loc)}
          onFuelTypeChange={setFuelType}
          onNlPriceChange={setNlPrice}
          fuelType={fuelType}
          nlPrice={nlPrice}
          netProfit={bestResult?.profit ?? null}
          bestStation={bestResult?.name ?? null}
        />
      </div>

      {/* Map */}
      <div className="relative flex-1">
        {loading && (
          <div className="absolute left-4 top-4 z-[1000] rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            Stations laden...
          </div>
        )}
        <FuelMap
          stations={stations}
          userLocation={userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null}
          fuelType={fuelType}
          nlPrice={nlPrice}
          consumption={vehicle.verbruik}
          tankSize={vehicle.tankinhoud}
        />
      </div>
    </div>
  );
}
