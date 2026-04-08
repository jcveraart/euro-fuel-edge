import { useState, useEffect, useMemo } from 'react';
import { Navigation, Share2, Clock, Fuel, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { FuelMap } from '@/components/FuelMap';
import { toast } from 'sonner';
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

  const allRanked = useMemo(() => {
    if (!stationOptions.length) return [];
    return rankStations(stationOptions, fuelType, fuelUseL100, currentLiters, vehicle.tankinhoud, nlPrice);
  }, [stationOptions, fuelType, fuelUseL100, currentLiters, vehicle.tankinhoud, nlPrice]);

  const top3 = useMemo<RankedStation[]>(() => {
    return allRanked.slice(0, 3).map((r, i) => ({
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

  useEffect(() => {
    if (top3.length === 0) { setSelectedStation(null); return; }
    const currentInList = selectedStation && top3.some(r => r.station.id === selectedStation.id);
    if (!currentInList) setSelectedStation(top3[0].station);
  }, [top3]);

  useEffect(() => {
    if (!selectedStation || !userLocation) { setRoute(null); return; }
    const ranked = top3.find(r => r.station.id === selectedStation.id);
    if (!ranked) { setRoute(null); return; }

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

  const allMapStations = useMemo(() => allRanked.map(r => r.station), [allRanked]);

  const openInMaps = (s: FuelStation) =>
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving`, '_blank');

  const shareResult = (ranked: RankedStation) => {
    const s = ranked.station;
    navigator.clipboard.writeText(
      `Ik bespaar €${ranked.profit.toFixed(2)} door te tanken bij ${s.brand || s.name} in ${s.place}! 🚗⛽`
    );
    toast.success('Gekopieerd!');
  };

  return (
    /* Both mobile and desktop get fixed viewport height so flex-1 distributes space to the map. */
    <div className="flex h-[100dvh] flex-col pt-14 md:flex-row">

      {/* ── Settings sidebar ── */}
      <div className="w-full shrink-0 border-b border-border bg-card/60 backdrop-blur-sm md:w-80 md:border-b-0 md:border-r lg:w-96">
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
          stationsCount={stationOptions.length}
          loadingMsg={loadingMsg}
        />
      </div>

      {/* ── Map ── */}
      <div className="relative min-h-[180px] flex-1">
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
        />
      </div>

      {/* ── Mobile station cards (horizontal scroll, below map) ── */}
      {top3.length > 0 && (
        <div className="border-t border-border bg-card/60 backdrop-blur-sm md:hidden">
          <div className="flex gap-2 overflow-x-auto p-2">
            {top3.map((ranked) => {
              const s = ranked.station;
              const isSelected = selectedStation?.id === s.id;
              const price = s[fuelType];
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStation(s)}
                  className={`min-w-[175px] flex-shrink-0 rounded-xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-semibold text-muted-foreground">{ranked.rank}.</span>
                        <span className="truncate text-xs font-semibold text-foreground">{s.brand || s.name}</span>
                      </div>
                      <p className="truncate text-[10px] text-muted-foreground">{s.place}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Fuel className="h-2.5 w-2.5 text-primary" />
                        <span className="font-mono text-xs font-bold text-primary">€{price?.toFixed(3)}</span>
                        {isSelected && routeLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        {isSelected && route && !routeLoading && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" />{route.durationMin}m
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-mono text-sm font-bold leading-tight ${ranked.profit > 0 ? 'text-profit' : 'text-loss'}`}>
                        {ranked.profit > 0 ? '+' : ''}€{ranked.profit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="mt-1.5 flex gap-1">
                      <Button size="sm" className="h-6 flex-1 gap-1 text-[10px]"
                        onClick={(e) => { e.stopPropagation(); openInMaps(s); }}>
                        <Navigation className="h-3 w-3" /> Navigeer
                      </Button>
                      {ranked.profit > 0 && (
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                          onClick={(e) => { e.stopPropagation(); shareResult(ranked); }}>
                          <Share2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
