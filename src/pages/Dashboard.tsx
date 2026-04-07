import { useState, useEffect } from 'react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { FuelMap } from '@/components/FuelMap';
import { fetchStationsForLocation, fetchRoute, DEFAULT_PRICES, type RouteData } from '@/lib/api';
import type { FuelStation, VehicleData } from '@/lib/calculations';
import { calculateNetProfit } from '@/lib/calculations';

export interface RankedStation {
  station: FuelStation;
  profit: number;
  rank: number;
}

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
  const [allStations, setAllStations] = useState<FuelStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTankPercent, setCurrentTankPercent] = useState(50);
  const [top3, setTop3] = useState<RankedStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<FuelStation | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const currentLiters = vehicle.tankinhoud * (currentTankPercent / 100);

  useEffect(() => {
    setNlPrice(DEFAULT_PRICES.nl[fuelType]);
  }, [fuelType]);

  // Fetch stations whenever location or fuel type changes
  useEffect(() => {
    if (!userLocation) return;
    setLoading(true);
    setAllStations([]);
    setTop3([]);
    setSelectedStation(null);
    setRoute(null);

    fetchStationsForLocation(userLocation.lat, userLocation.lng, fuelType)
      .then((results) => {
        setAllStations(results);
      })
      .finally(() => setLoading(false));
  }, [userLocation, fuelType]);

  // From all stations: take 10 closest, rank by savings, pick top 3
  useEffect(() => {
    if (!userLocation || !allStations.length) {
      setTop3([]);
      setSelectedStation(null);
      return;
    }

    // Stations are already sorted by dist (sort=dist from API)
    // Take the 10 closest that have a price for this fuel type
    const closest10 = allStations
      .filter((s) => s[fuelType] != null)
      .slice(0, 10);

    // Score each by net savings
    const scored = closest10
      .map((s) => ({
        station: s,
        profit: calculateNetProfit(
          nlPrice,
          s[fuelType]!,
          vehicle.tankinhoud,
          s.dist ?? 10,
          vehicle.verbruik,
          currentLiters
        ),
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 3)
      .map((x, i) => ({ ...x, rank: i + 1 }));

    setTop3(scored);
    setSelectedStation(scored[0]?.station ?? null);
  }, [allStations, fuelType, nlPrice, currentLiters, vehicle.verbruik, vehicle.tankinhoud, userLocation]);

  // Fetch route to selected station
  useEffect(() => {
    if (!selectedStation || !userLocation) {
      setRoute(null);
      return;
    }
    setRouteLoading(true);
    fetchRoute(userLocation.lat, userLocation.lng, selectedStation.lat, selectedStation.lng)
      .then(setRoute)
      .finally(() => setRouteLoading(false));
  }, [selectedStation, userLocation]);

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
          top3={top3}
          selectedStation={selectedStation}
          onSelectStation={setSelectedStation}
          route={route}
          routeLoading={routeLoading}
          hasLocation={!!userLocation}
          stationsLoading={loading}
          stationsCount={allStations.length}
        />
      </div>

      <div className="relative flex-1">
        <FuelMap
          stations={top3.map((r) => r.station)}
          allStations={allStations.filter((s) => s[fuelType] != null).slice(0, 10)}
          userLocation={userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null}
          fuelType={fuelType}
          nlPrice={nlPrice}
          consumption={vehicle.verbruik}
          tankSize={vehicle.tankinhoud}
          currentLiters={currentLiters}
          selectedStation={selectedStation}
          onStationClick={setSelectedStation}
          route={route}
          loading={loading}
        />
      </div>
    </div>
  );
}
