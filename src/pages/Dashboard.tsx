import { useState, useEffect, useMemo } from 'react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { StationsPanel } from '@/components/StationsPanel';
import { FuelMap } from '@/components/FuelMap';
import { useTheme } from '@/context/ThemeContext';
import {
  fetchCrossingsAndStations,
  rankStations,
  fetchRoute,
  DEFAULT_PRICES,
  type RouteData,
  type StationOption,
} from '@/lib/api';
import type { FuelStation, VehicleData } from '@/lib/calculations';

export interface RankedStation {
  station: FuelStation;
  profit: number;
  rank: number;
  crossingName: string;
  distHomeCrossingKm: number;
  durationHomeCrossingMin: number;
  distCrossingStationKm: number;
  routeHomeToCrossing: [number, number][];
  crossingLat: number;
  crossingLng: number;
}

export default function Dashboard() {
  const { theme } = useTheme();

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
  const [stationOptions, setStationOptions] = useState<StationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [currentTankPercent, setCurrentTankPercent] = useState(50);
  const [selectedStation, setSelectedStation] = useState<FuelStation | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const currentLiters = vehicle.tankinhoud * (currentTankPercent / 100);
  const fuelUseL100 = 100 / vehicle.verbruik;

  useEffect(() => {
    setNlPrice(DEFAULT_PRICES.nl[fuelType]);
  }, [fuelType]);

  // Fetch crossings + stations when location changes
  useEffect(() => {
    if (!userLocation) return;
    setLoading(true);
    setStationOptions([]);
    setSelectedStation(null);
    setRoute(null);

    fetchCrossingsAndStations(userLocation.lat, userLocation.lng, setLoadingMsg)
      .then(setStationOptions)
      .finally(() => {
        setLoading(false);
        setLoadingMsg('');
      });
  }, [userLocation]);

  // Rank instantly on any parameter change
  const allRanked = useMemo(() => {
    if (!stationOptions.length) return [];
    return rankStations(stationOptions, fuelType, fuelUseL100, currentLiters, vehicle.tankinhoud, nlPrice);
  }, [stationOptions, fuelType, fuelUseL100, currentLiters, vehicle.tankinhoud, nlPrice]);

  const top3 = useMemo<RankedStation[]>(() => {
    return allRanked.slice(0, 5).map((r, i) => ({
      station: r.station,
      profit: r.netSavings,
      rank: i + 1,
      crossingName: r.crossingName,
      distHomeCrossingKm: r.distHomeCrossingKm,
      durationHomeCrossingMin: r.durationHomeCrossingMin,
      distCrossingStationKm: r.distCrossingStationKm,
      routeHomeToCrossing: r.routeHomeToCrossing,
      crossingLat: r.crossingLat,
      crossingLng: r.crossingLng,
    }));
  }, [allRanked]);

  // Auto-select best station
  useEffect(() => {
    if (top3.length === 0) {
      setSelectedStation(null);
      return;
    }
    const currentInList = selectedStation && top3.some((r) => r.station.id === selectedStation.id);
    if (!currentInList) setSelectedStation(top3[0].station);
  }, [top3]);

  // Two-leg route: home → crossing → station
  useEffect(() => {
    if (!selectedStation || !userLocation) {
      setRoute(null);
      return;
    }
    const ranked = top3.find((r) => r.station.id === selectedStation.id);
    if (!ranked) {
      setRoute(null);
      return;
    }
    setRouteLoading(true);
    fetchRoute(ranked.crossingLat, ranked.crossingLng, selectedStation.lat, selectedStation.lng)
      .then((legRoute) => {
        if (legRoute && ranked.routeHomeToCrossing.length) {
          setRoute({
            coordinates: [...ranked.routeHomeToCrossing, ...legRoute.coordinates],
            distanceKm: Math.round((ranked.distHomeCrossingKm + legRoute.distanceKm) * 10) / 10,
            durationMin: ranked.durationHomeCrossingMin + legRoute.durationMin,
          });
        } else {
          setRoute(null);
        }
      })
      .finally(() => setRouteLoading(false));
  }, [selectedStation, userLocation]);

  const allMapStations = useMemo(() => allRanked.map((r) => r.station), [allRanked]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] pt-14">
      {/* Left column: settings */}
      <div className="w-72 shrink-0 overflow-y-auto border-r border-border bg-card/60 backdrop-blur-sm">
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
          hasLocation={!!userLocation}
          stationsLoading={loading}
          stationsCount={stationOptions.length}
          loadingMsg={loadingMsg}
        />
      </div>

      {/* Center: map */}
      <div className="relative flex-1">
        <FuelMap
          stations={top3.map((r) => r.station)}
          allStations={allMapStations}
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
          isDark={theme === 'dark'}
        />
      </div>

      {/* Right column: results — only shown when stations are loaded */}
      {top3.length > 0 && (
        <div className="w-72 shrink-0 border-l border-border bg-card/60 backdrop-blur-sm">
          <StationsPanel
            top3={top3}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
            fuelType={fuelType}
            route={route}
            routeLoading={routeLoading}
          />
        </div>
      )}
    </div>
  );
}
