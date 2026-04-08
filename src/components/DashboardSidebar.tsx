import { useState, useCallback } from 'react';
import { Search, Car, Fuel, Loader2, Share2, Navigation, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { fetchRDWData, fetchRDWFuel, fetchTankSize, type RouteData } from '@/lib/api';
import type { FuelStation, VehicleData } from '@/lib/calculations';
import type { RankedStation } from '@/pages/Dashboard';
import { toast } from 'sonner';

interface DashboardSidebarProps {
  vehicle: VehicleData;
  fuelType: 'e5' | 'e10' | 'diesel';
  nlPrice: number;
  currentTankPercent: number;
  currentLiters: number;
  top3: RankedStation[];
  selectedStation: FuelStation | null;
  route: RouteData | null;
  routeLoading: boolean;
  hasLocation: boolean;
  stationsLoading: boolean;
  stationsCount: number;
  loadingMsg?: string;
  onVehicleChange: (v: VehicleData) => void;
  onLocationChange: (loc: { lat: number; lng: number; display: string }) => void;
  onFuelTypeChange: (type: 'e5' | 'e10' | 'diesel') => void;
  onNlPriceChange: (price: number) => void;
  onTankPercentChange: (pct: number) => void;
  onSelectStation: (s: FuelStation) => void;
}

export function DashboardSidebar({
  vehicle,
  fuelType,
  nlPrice,
  currentTankPercent,
  currentLiters,
  top3,
  selectedStation,
  route,
  routeLoading,
  hasLocation,
  stationsLoading,
  stationsCount,
  onVehicleChange,
  onLocationChange,
  onFuelTypeChange,
  onNlPriceChange,
  onTankPercentChange,
  onSelectStation,
  loadingMsg,
}: DashboardSidebarProps) {
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
        const tankSize = await fetchTankSize(merk, model);
        onVehicleChange({
          ...vehicle,
          kenteken: rdw.kenteken || kenteken,
          merk, model, brandstof,
          ...(fuel.verbruik ? { verbruik: fuel.verbruik } : {}),
          ...(tankSize ? { tankinhoud: tankSize } : {}),
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

  const tankColor = currentTankPercent <= 15 ? 'text-red-500' : currentTankPercent <= 30 ? 'text-yellow-500' : 'text-profit';

  const openInMaps = (s: FuelStation) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving`, '_blank');
  };

  const shareResult = (ranked: RankedStation) => {
    const s = ranked.station;
    navigator.clipboard.writeText(
      `Ik bespaar €${ranked.profit.toFixed(2)} door te tanken bij ${s.brand || s.name} in ${s.place}! 🚗⛽ #GrensTanker`
    );
    toast.success('Resultaat gekopieerd!');
  };

  const box = 'rounded-xl border border-border bg-background p-2.5';
  const lbl = 'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground';

  // ── Settings form (desktop only) ──
  const settingsForm = (
    <div className="flex flex-col gap-1.5">
      {stationsLoading && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
          {loadingMsg || 'Stations zoeken...'}
        </div>
      )}
      {hasLocation && !stationsLoading && stationsCount === 0 && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            Geen stations gevonden. Probeer dichter bij de grens.
          </p>
        </div>
      )}

      {/* Kenteken */}
      <div className={box}>
        <Label className={`${lbl} flex items-center gap-1.5`}>
          <Car className="h-3 w-3" /> Voertuig
        </Label>
        <div className="mt-1.5 flex gap-1.5">
          <Input
            placeholder="AB-123-CD"
            value={kenteken}
            onChange={(e) => setKenteken(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && lookupKenteken()}
            className="h-8 font-mono text-sm uppercase"
          />
          <Button size="sm" className="h-8 w-8 shrink-0 p-0" onClick={lookupKenteken} disabled={loadingKenteken}>
            {loadingKenteken ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {vehicle.merk !== 'Onbekend' && (
          <p className="mt-1 text-xs text-primary">{vehicle.merk} {vehicle.model} · {vehicle.brandstof}</p>
        )}
      </div>

      {/* Rijgegevens */}
      <div className={box}>
        <Label className={`${lbl} flex items-center gap-1.5`}>
          <Fuel className="h-3 w-3" /> Rijgegevens
        </Label>
        <div className="mt-2 space-y-2.5">
          <div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">1 op</span>
              <span className="font-mono text-xs font-medium">{vehicle.verbruik} km</span>
            </div>
            <Slider className="mt-1" value={[vehicle.verbruik]}
              onValueChange={([v]) => onVehicleChange({ ...vehicle, verbruik: v })}
              min={5} max={30} step={0.5} />
          </div>
          <div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Tankinhoud</span>
              <span className="font-mono text-xs font-medium">{vehicle.tankinhoud} L</span>
            </div>
            <Slider className="mt-1" value={[vehicle.tankinhoud]}
              onValueChange={([v]) => onVehicleChange({ ...vehicle, tankinhoud: v })}
              min={20} max={100} step={5} />
          </div>
          <div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Huidige stand</span>
              <span className={`font-mono text-xs font-semibold ${tankColor}`}>
                {currentTankPercent}% · {currentLiters.toFixed(0)} L
              </span>
            </div>
            <Slider className="mt-1" value={[currentTankPercent]}
              onValueChange={([v]) => onTankPercentChange(v)}
              min={0} max={100} step={5} />
            {currentTankPercent <= 15 && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                <AlertTriangle className="h-3 w-3" /> Tank bijna leeg!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Brandstof + NL prijs */}
      <div className={box}>
        <Label className={lbl}>Brandstof</Label>
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {(['e5', 'e10', 'diesel'] as const).map((ft) => (
            <button key={ft} onClick={() => onFuelTypeChange(ft)}
              className={`rounded-lg py-1.5 text-xs font-semibold uppercase transition-colors ${
                fuelType === ft
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}>
              {ft}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <Label className={lbl}>NL Prijs (€/L)</Label>
          <Input type="number" step="0.001" value={nlPrice}
            onChange={(e) => onNlPriceChange(parseFloat(e.target.value) || 0)}
            className="mt-1 h-8 font-mono text-sm" />
        </div>
      </div>

      {!hasLocation && (
        <p className="pt-0.5 text-center text-xs text-muted-foreground">
          Voer je locatie in om te starten.
        </p>
      )}
    </div>
  );

  // ── Desktop results cards ──
  const resultsSection = top3.length > 0 ? (
    <div className="flex flex-col gap-1.5">
      <p className={`${lbl} px-0.5`}>Top 3 beste opties</p>
      {top3.map((ranked) => {
        const s = ranked.station;
        const isSelected = selectedStation?.id === s.id;
        const price = s[fuelType];
        return (
          <button key={s.id} onClick={() => onSelectStation(s)}
            className={`w-full rounded-xl border p-2.5 text-left transition-all ${
              isSelected ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:bg-accent/40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{ranked.rank}.</span>
                  <span className="truncate text-sm font-semibold text-foreground">{s.brand || s.name}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{s.place} · {(s.dist ?? 0).toFixed(1)} km</p>
                <p className="truncate text-[10px] text-muted-foreground/70">via {ranked.crossingName.split(' (')[0]}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">€{price?.toFixed(3)}/L</span>
                  {isSelected && route && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {routeLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : `${route.durationMin} min`}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className={`font-mono text-base font-bold leading-tight ${ranked.profit > 0 ? 'text-profit' : 'text-loss'}`}>
                  {ranked.profit > 0 ? '+' : ''}€{ranked.profit.toFixed(2)}
                </p>
                <p className="text-[10px] text-muted-foreground">besparing</p>
              </div>
            </div>
            {isSelected && (
              <div className="mt-2 flex gap-1.5">
                <Button size="sm" className="h-7 flex-1 gap-1.5 text-xs"
                  onClick={(e) => { e.stopPropagation(); openInMaps(s); }}>
                  <Navigation className="h-3.5 w-3.5" /> Navigeer
                </Button>
                {ranked.profit > 0 && (
                  <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs"
                    onClick={(e) => { e.stopPropagation(); shareResult(ranked); }}>
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      {/* ── DESKTOP (md+): scrollable full sidebar with settings + results ── */}
      <div className="hidden h-full flex-col gap-1.5 overflow-y-auto p-2.5 md:flex">
        <div className={box}>
          <Label className={lbl}>Je Locatie</Label>
          <div className="mt-1.5">
            <AddressAutocomplete
              onSelect={(loc) => { onLocationChange(loc); toast.success('Locatie gevonden'); }}
            />
          </div>
        </div>
        {settingsForm}
        {resultsSection}
      </div>

      {/* ── MOBILE (< md): ultra-compact flat settings ── */}
      <div className="flex flex-col gap-1.5 px-2.5 py-2 md:hidden">

        {/* Row 1: Location */}
        <AddressAutocomplete
          onSelect={(loc) => { onLocationChange(loc); toast.success('Locatie gevonden'); }}
        />

        {/* Row 2: Kenteken + Fuel type buttons + NL price */}
        <div className="flex items-center gap-1.5">
          <div className="flex min-w-0 flex-1 gap-1">
            <Input
              placeholder="Kenteken"
              value={kenteken}
              onChange={(e) => setKenteken(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && lookupKenteken()}
              className="h-8 min-w-0 flex-1 font-mono text-xs uppercase"
            />
            <Button size="sm" className="h-8 w-8 shrink-0 p-0" onClick={lookupKenteken} disabled={loadingKenteken}>
              {loadingKenteken ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <div className="flex shrink-0 overflow-hidden rounded-lg border border-border">
            {(['e5', 'e10', 'diesel'] as const).map((ft) => (
              <button key={ft} onClick={() => onFuelTypeChange(ft)}
                className={`px-2 py-1.5 text-[10px] font-bold uppercase transition-colors ${
                  fuelType === ft ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                }`}>
                {ft === 'diesel' ? 'D' : ft.toUpperCase()}
              </button>
            ))}
          </div>
          <Input
            type="number" step="0.001" value={nlPrice}
            onChange={(e) => onNlPriceChange(parseFloat(e.target.value) || 0)}
            className="h-8 w-[4.5rem] shrink-0 font-mono text-xs"
          />
        </div>

        {/* Row 3: 3 compact sliders side-by-side */}
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>1op</span><span className="font-mono">{vehicle.verbruik}</span>
            </div>
            <Slider value={[vehicle.verbruik]}
              onValueChange={([v]) => onVehicleChange({ ...vehicle, verbruik: v })}
              min={5} max={30} step={0.5} className="mt-1" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Tank</span><span className="font-mono">{vehicle.tankinhoud}L</span>
            </div>
            <Slider value={[vehicle.tankinhoud]}
              onValueChange={([v]) => onVehicleChange({ ...vehicle, tankinhoud: v })}
              min={20} max={100} step={5} className="mt-1" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">Vol</span>
              <span className={`font-mono font-semibold ${tankColor}`}>{currentTankPercent}%</span>
            </div>
            <Slider value={[currentTankPercent]}
              onValueChange={([v]) => onTankPercentChange(v)}
              min={0} max={100} step={5} className="mt-1" />
          </div>
        </div>

        {/* Status line: vehicle name / loading / warning */}
        {(vehicle.merk !== 'Onbekend' || stationsLoading || (hasLocation && !stationsLoading && stationsCount === 0)) && (
          <div className="flex items-center gap-1.5 px-0.5">
            {vehicle.merk !== 'Onbekend' && (
              <span className="truncate text-xs text-primary">{vehicle.merk} {vehicle.model} · {vehicle.brandstof}</span>
            )}
            {stationsLoading && (
              <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {loadingMsg || 'Zoeken...'}
              </div>
            )}
            {hasLocation && !stationsLoading && stationsCount === 0 && (
              <span className="flex items-center gap-1 text-[10px] text-yellow-500">
                <AlertTriangle className="h-3 w-3" /> Dichter bij de grens
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
