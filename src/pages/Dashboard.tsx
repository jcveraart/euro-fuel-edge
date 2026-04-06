import { useState, useEffect, useCallback } from 'react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { FuelMap } from '@/components/FuelMap';
import { fetchGermanStations, fetchRoute, DEFAULT_PRICES, BORDER_POINTS, type RouteData } from '@/lib/api';
import type { FuelStation, VehicleData } from '@/lib/calculations';
import { calculateNetProfit, canReachStation } from '@/lib/calculations';

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
  const [currentTankPercent, setCurrentTankPercent] = useState(50);
  const [bestStation, setBestStation] = useState<FuelStation | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const currentLiters = vehicle.tankinhoud * (currentTankPercent / 100);

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

  // Find best reachable station when inputs change
  useEffect(() => {
    if (!userLocation || !stations.length) {
      setBestStation(null);
      setRoute(null);
      return;
    }

    let best: FuelStation | null = null;
    let bestProfit = -Infinity;

    for (const s of stations) {
      const price = s[fuelType];
      if (!price) continue;
      const dist = s.dist ?? 10;
      if (!canReachStation(dist, vehicle.verbruik, currentLiters)) continue;
      const profit = calculateNetProfit(nlPrice, price, vehicle.tankinhoud, dist, vehicle.verbruik, currentLiters);
      if (profit > bestProfit) {
        bestProfit = profit;
        best = s;
      }
    }

    setBestStation(best);
  }, [stations, userLocation, fuelType, nlPrice, currentLiters, vehicle.verbruik, vehicle.tankinhoud]);

  // Fetch route when best station changes
  useEffect(() => {
    if (!bestStation || !userLocation) {
      setRoute(null);
      return;
    }
    setRouteLoading(true);
    fetchRoute(userLocation.lat, userLocation.lng, bestStation.lat, bestStation.lng)
      .then(setRoute)
      .finally(() => setRouteLoading(false));
  }, [bestStation, userLocation]);

  // Derive stats for sidebar
  const reachableCount = userLocation
    ? stations.filter((s) => {
        const price = s[fuelType];
        return price && canReachStation(s.dist ?? 10, vehicle.verbruik, currentLiters);
      }).length
    : 0;

  const bestProfit = bestStation
    ? calculateNetProfit(
        nlPrice,
        bestStation[fuelType] ?? 0,
        vehicle.tankinhoud,
        bestStation.dist ?? 10,
        vehicle.verbruik,
        currentLiters
      )
    : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] pt-14">
      <div className="w-80 shrink-0 border-r border-border bg-card/50 backdrop-blur-sm lg:w-96">
        <DashboardSidebar
          vehicle={vehicle}
          onVehicleChange={setVehicle}
          onLocationChange={(loc) => setUserLocation(loc)}
          onFuelTypeChange={setFuelType}
          onNlPriceChange={setNlPrice}
          fuelType={fuelType}
          nlPrice={nlPrice}
          currentTankPercent={currentTankPercent}
          onTankPercentChange={setCurrentTankPercent}
          currentLiters={currentLiters}
          netProfit={bestProfit}
          bestStation={bestStation}
          route={route}
          routeLoading={routeLoading}
          reachableCount={reachableCount}
          hasLocation={!!userLocation}
        />
      </div>

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
          currentLiters={currentLiters}
          bestStation={bestStation}
          route={route}
        />
      </div>
    </div>
  );
}
