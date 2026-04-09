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
          <div className="max-h-[42vh] overflow-y-auto px-3 pb-safe pb-4">
            <div className="flex flex-col gap-2">
              {top3.map((ranked, i) => {
                const s = ranked.station;
                const price = s[fuelType];
                const isSelected = selectedStation?.id === s.id;

                return (
                  <button
                    key={s.id}
                    onClick={() => onStationSelect(s)}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-background active:bg-accent/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <span className="w-4 shrink-0 text-center text-[11px] font-bold text-muted-foreground">
                        {i + 1}
                      </span>

                      {/* Name + location */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {s.brand || s.name}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {s.place} · via {ranked.crossingName.split(' (')[0]}
                        </p>
                      </div>

                      {/* Price + savings */}
                      <div className="shrink-0 text-right">
                        <p className={`font-mono text-base font-bold leading-tight ${
                          ranked.profit > 0 ? 'text-profit' : 'text-loss'
                        }`}>
                          {ranked.profit > 0 ? '+' : ''}€{ranked.profit.toFixed(2)}
                        </p>
                        <p className="flex items-center justify-end gap-0.5 text-[11px] font-medium text-primary">
                          <Fuel className="h-2.5 w-2.5" />
                          €{price?.toFixed(3)}
                        </p>
                      </div>

                      {/* Navigate button (selected only) */}
                      {isSelected && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openInMaps(s); }}
                          className="shrink-0 rounded-lg bg-primary p-2 text-primary-foreground"
                        >
                          <Navigation className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
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
