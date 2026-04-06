import { useState, useEffect } from 'react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { FuelMap } from '@/components/FuelMap';
import { fetchGermanStations, fetchRoute, DEFAULT_PRICES, type RouteData } from '@/lib/api';
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
  const [topStations, setTopStations] = useState<FuelStation[]>([]);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const currentLiters = vehicle.tankinhoud * (currentTankPercent / 100);

  // Update NL price when fuel type changes
  useEffect(() => {
    setNlPrice(DEFAULT_PRICES.nl[fuelType]);
  }, [fuelType]);

  // Fetch German stations around user location (30km radius)
  useEffect(() => {
    if (!userLocation) return;
    setLoading(true);
    setStations([]);
    setBestStation(null);
    setRoute(null);

    fetchGermanStations(userLocation.lat, userLocation.lng, 30, fuelType)
      .then((results) => setStations(results))
      .finally(() => setLoading(false));
  }, [userLocation, fuelType]);

  // Sort all stations by profit, pick top 10 and best
  useEffect(() => {
    if (!userLocation || !stations.length) {
      setTopStations([]);
      setBestStation(null);
      return;
    }

    const scored = stations
      .map((s) => {
        const price = s[fuelType];
        if (!price) return null;
        const dist = s.dist ?? 10;
        const reachable = canReachStation(dist, vehicle.verbruik, currentLiters);
        const profit = calculateNetProfit(nlPrice, price, vehicle.tankinhoud, dist, vehicle.verbruik, currentLiters);
        return { station: s, profit, reachable };
      })
      .filter((x): x is { station: FuelStation; profit: number; reachable: boolean } => x !== null)
      .sort((a, b) => b.profit - a.profit);

    const reachable = scored.filter((x) => x.reachable);
    const top10 = reachable.slice(0, 10).map((x) => x.station);

    setTopStations(top10);
    setBestStation(top10[0] ?? null);
  }, [stations, fuelType, nlPrice, currentLiters, vehicle.verbruik, vehicle.tankinhoud, userLocation]);

  // Fetch route to best station
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
          stationsLoading={loading}
        />
      </div>

      <div className="relative flex-1">
        <FuelMap
          stations={topStations}
          userLocation={userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null}
          fuelType={fuelType}
          nlPrice={nlPrice}
          consumption={vehicle.verbruik}
          tankSize={vehicle.tankinhoud}
          currentLiters={currentLiters}
          bestStation={bestStation}
          route={route}
          loading={loading}
        />
      </div>
    </div>
  );
}
