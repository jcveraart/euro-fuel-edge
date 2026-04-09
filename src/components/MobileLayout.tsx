import { useState, useCallback } from 'react';
import { SlidersHorizontal, Loader2, MapPin, Navigation, Fuel, Search, Droplets } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { FuelMap } from '@/components/FuelMap';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { fetchRDWData, fetchRDWFuel, fetchTankSize } from '@/lib/api';
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
  const [kenteken, setKenteken] = useState('');
  const [loadingKenteken, setLoadingKenteken] = useState(false);

  const lookupKenteken = useCallback(async () => {
    if (!kenteken.trim()) return;
    setLoadingKenteken(true);
    try {
      const [rdw, fuel] = await Promise.all([fetchRDWData(kenteken), fetchRDWFuel(kenteken)]);
      if (rdw) {
        const brandstof = fuel.brandstof || rdw.brandstof || 'Benzine';
        const merk = rdw.merk || 'Onbekend';
        const model = rdw.model || 'Onbekend';
        const voertuigsoort = (rdw.voertuigsoort ?? '').toLowerCase();
        const isVrachtwagen = voertuigsoort.includes('vracht');
        const isBestelbus = voertuigsoort.includes('bestel') || voertuigsoort.includes('bedrijf');
        const defaults = isVrachtwagen ? { verbruik: 5, tankinhoud: 400 }
                       : isBestelbus   ? { verbruik: 10, tankinhoud: 70 }
                       :                 { verbruik: 15, tankinhoud: 50 };
        const tankSize = await fetchTankSize(merk, model);
        onVehicleChange({
          ...vehicle,
          kenteken: rdw.kenteken || kenteken,
          merk, model, brandstof,
          verbruik: fuel.verbruik ?? defaults.verbruik,
          tankinhoud: tankSize ?? defaults.tankinhoud,
        });
        if (brandstof.toLowerCase().includes('diesel')) onFuelTypeChange('diesel');
        toast.success(`${merk} ${model} gevonden!`);
      } else {
        toast.error('Kenteken niet gevonden');
      }
    } catch {
      toast.error('Fout bij RDW lookup');
    }
    setLoadingKenteken(false);
  }, [kenteken, vehicle, onVehicleChange, onFuelTypeChange]);

  const openInMaps = (s: FuelStation) =>
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving`, '_blank');

  const tankColor = currentTankPercent <= 15 ? 'text-red-500'
                  : currentTankPercent <= 30 ? 'text-yellow-500'
                  : 'text-profit';

  return (
    // pt accounts for fixed Navbar height + iOS safe-area-inset-top (Dynamic Island)
    <div
      className="flex h-[100dvh] flex-col overflow-hidden"
      style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top))' }}
    >

      {/* ── Top bar ── */}
      <div className="shrink-0 border-b border-border bg-background/95 px-3 py-2 backdrop-blur-xl">
        <AddressAutocomplete
          onSelect={(loc) => { onLocationChange(loc); toast.success('Locatie gevonden'); }}
        />
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="relative flex-1">
            <Input
              placeholder="Kenteken (AB-123-CD)"
              value={kenteken}
              onChange={(e) => setKenteken(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && lookupKenteken()}
              className="h-8 pr-2 font-mono uppercase"
            />
            {vehicle.merk !== 'Onbekend' && (
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-primary">
                {vehicle.merk.split(' ')[0]}
              </span>
            )}
          </div>
          <Button
            size="sm"
            className="h-8 w-8 shrink-0 p-0"
            onClick={lookupKenteken}
            disabled={loadingKenteken}
          >
            {loadingKenteken ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          </Button>
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
        {/* Cover map while settings sheet is open to prevent Leaflet glitch */}
        {settingsOpen && (
          <div className="absolute inset-0 z-10 bg-background" />
        )}
      </div>

      {/* ── Bottom stations panel ── */}
      <div className="shrink-0 rounded-t-2xl border-t border-border bg-card shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
        {/* Drag handle */}
        <div className="flex justify-center pb-0.5 pt-2">
          <div className="h-1 w-8 rounded-full bg-muted-foreground/25" />
        </div>

        {/* Tank level slider — always visible */}
        <div className="flex items-center gap-2 px-3 pb-1.5 pt-0.5">
          <Droplets className={`h-3.5 w-3.5 shrink-0 ${tankColor}`} />
          <Slider
            value={[currentTankPercent]}
            onValueChange={([v]) => onTankPercentChange(v)}
            min={0} max={100} step={5}
            className="flex-1"
          />
          <span className={`w-14 text-right font-mono text-[10px] font-semibold shrink-0 ${tankColor}`}>
            {currentTankPercent}% · {currentLiters.toFixed(0)}L
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {loadingMsg || 'Stations zoeken...'}
          </div>
        ) : top3.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-3">
            <MapPin className="h-4 w-4 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">Voer je locatie in voor de beste opties</p>
          </div>
        ) : (
          /* Horizontal snap-scroll cards */
          <div
            className="flex gap-2.5 overflow-x-auto px-3 pb-3 pt-0.5 snap-x snap-mandatory scrollbar-none"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {top3.map((ranked, i) => {
              const s = ranked.station;
              const price = s[fuelType];
              const isSelected = selectedStation?.id === s.id;

              return (
                <button
                  key={s.id}
                  onClick={() => onStationSelect(s)}
                  className={`snap-start shrink-0 w-40 rounded-xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? 'border-primary/50 bg-primary/5 shadow-sm'
                      : 'border-border bg-background active:scale-[0.97]'
                  }`}
                >
                  {/* Rank + nav */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    {isSelected && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openInMaps(s); }}
                        className="flex items-center justify-center rounded-md bg-primary p-1 text-primary-foreground"
                      >
                        <Navigation className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-foreground leading-tight truncate">
                    {s.brand || s.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {s.place} · via {ranked.crossingName.split(' (')[0]}
                  </p>

                  <div className="mt-2 flex items-center justify-between">
                    <p className="flex items-center gap-0.5 text-xs font-semibold text-primary">
                      <Fuel className="h-2.5 w-2.5" />
                      €{price?.toFixed(3)}/L
                    </p>
                    <p className={`font-mono text-sm font-bold leading-tight ${
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
