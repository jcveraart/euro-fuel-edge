import { useState } from 'react';
import { SlidersHorizontal, Loader2, MapPin, Navigation, Fuel } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { FuelMap } from '@/components/FuelMap';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { toast } from 'sonner';
import type { RankedStation } from '@/pages/Dashboard';
import type { FuelStation, VehicleData } from '@/lib/calculations';
import type { RouteData } from '@/lib/api';

interface MobileLayoutProps {
  vehicle: VehicleData;
  fuelType: 'e5' | 'e10' | 'diesel';
  nlPrice: number;
  currentTankPercent: number;
  currentLiters: number;
  top3: RankedStation[];
  allMapStations: FuelStation[];
  selectedStation: FuelStation | null;
  route: RouteData | null;
  loading: boolean;
  loadingMsg: string;
  stationsCount: number;
  userLocation: { lat: number; lng: number; display: string } | null;
  hasLocation: boolean;
  isDark: boolean;
  onVehicleChange: (v: VehicleData) => void;
  onLocationChange: (loc: { lat: number; lng: number; display: string }) => void;
  onFuelTypeChange: (ft: 'e5' | 'e10' | 'diesel') => void;
  onNlPriceChange: (p: number) => void;
  onTankPercentChange: (pct: number) => void;
  onStationSelect: (s: FuelStation) => void;
}

export function MobileLayout({
  vehicle, fuelType, nlPrice, currentTankPercent, currentLiters,
  top3, allMapStations, selectedStation, route, loading, loadingMsg,
  stationsCount, userLocation, hasLocation, isDark,
  onVehicleChange, onLocationChange, onFuelTypeChange,
  onNlPriceChange, onTankPercentChange, onStationSelect,
}: MobileLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openInMaps = (s: FuelStation) =>
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving`, '_blank');

  return (
    <div className="flex h-screen flex-col pt-14">

      {/* ── Top bar ── */}
      <div className="shrink-0 border-b border-border bg-background/95 px-3 py-2.5 backdrop-blur-xl">
        <AddressAutocomplete
          onSelect={(loc) => { onLocationChange(loc); toast.success('Locatie gevonden'); }}
        />
        <div className="mt-2 flex items-center gap-2">
          <div className="grid flex-1 grid-cols-3 gap-1">
            {(['e5', 'e10', 'diesel'] as const).map((ft) => (
              <button
                key={ft}
                onClick={() => onFuelTypeChange(ft)}
                className={`rounded-lg py-1.5 text-xs font-semibold uppercase transition-colors ${
                  fuelType === ft
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground active:bg-accent'
                }`}
              >
                {ft}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors active:bg-accent"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="relative min-h-0 flex-1">
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
          onStationClick={onStationSelect}
          route={route}
          loading={loading}
          isDark={isDark}
        />
      </div>

      {/* ── Bottom stations panel ── */}
      <div className="shrink-0 rounded-t-2xl border-t border-border bg-card shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
        {/* Drag handle */}
        <div className="flex justify-center pb-1 pt-2.5">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {loadingMsg || 'Stations zoeken...'}
          </div>
        ) : top3.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-5">
            <MapPin className="h-5 w-5 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">Voer je locatie in voor de beste opties</p>
          </div>
        ) : (
          /* Horizontal snap-scroll cards */
          <div className="flex gap-3 overflow-x-auto px-3 pb-5 pt-1 snap-x snap-mandatory scrollbar-none"
               style={{ WebkitOverflowScrolling: 'touch' }}>
            {top3.map((ranked, i) => {
              const s = ranked.station;
              const price = s[fuelType];
              const isSelected = selectedStation?.id === s.id;

              return (
                <button
                  key={s.id}
                  onClick={() => onStationSelect(s)}
                  className={`snap-start shrink-0 w-44 rounded-2xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? 'border-primary/50 bg-primary/5 shadow-sm'
                      : 'border-border bg-background active:scale-[0.97]'
                  }`}
                >
                  {/* Rank + brand */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    {isSelected && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openInMaps(s); }}
                        className="flex items-center justify-center rounded-lg bg-primary p-1.5 text-primary-foreground"
                      >
                        <Navigation className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <p className="font-semibold text-sm text-foreground leading-tight truncate">
                    {s.brand || s.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {s.place}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 truncate">
                    via {ranked.crossingName.split(' (')[0]}
                  </p>

                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="flex items-center gap-0.5 text-xs font-semibold text-primary">
                        <Fuel className="h-3 w-3" />
                        €{price?.toFixed(3)}/L
                      </p>
                    </div>
                    <p className={`font-mono text-base font-bold leading-tight ${
                      ranked.profit > 0 ? 'text-profit' : 'text-loss'
                    }`}>
                      {ranked.profit > 0 ? '+' : ''}€{ranked.profit.toFixed(2)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Settings sheet (slides up) ── */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" className="h-[88vh] overflow-y-auto rounded-t-2xl p-0">
          <div className="flex justify-center pb-1 pt-3">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
          </div>
          <DashboardSidebar
            vehicle={vehicle}
            onVehicleChange={onVehicleChange}
            onLocationChange={(loc) => {
              onLocationChange(loc);
              setSettingsOpen(false);
              toast.success('Locatie gevonden');
            }}
            onFuelTypeChange={onFuelTypeChange}
            onNlPriceChange={onNlPriceChange}
            fuelType={fuelType}
            nlPrice={nlPrice}
            currentTankPercent={currentTankPercent}
            onTankPercentChange={onTankPercentChange}
            currentLiters={currentLiters}
            hasLocation={hasLocation}
            stationsLoading={loading}
            stationsCount={stationsCount}
            loadingMsg={loadingMsg}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
