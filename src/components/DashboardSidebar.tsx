import { useState, useCallback } from 'react';
import { Search, Car, Fuel, Loader2, Share2, Navigation, AlertTriangle, Clock, RouteIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { fetchRDWData, fetchRDWFuel, fetchTankSize, DEFAULT_PRICES, type RouteData } from '@/lib/api';
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
    const text = `Ik bespaar €${ranked.profit.toFixed(2)} door te tanken bij ${s.brand || s.name} in ${s.place}! 🚗⛽ #GrensTanker`;
    navigator.clipboard.writeText(text);
    toast.success('Resultaat gekopieerd!');
  };

  const rankLabels = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex h-full w-full flex-col gap-3 overflow-y-auto p-4">
      <div className="space-y-0.5">
        <h2 className="text-lg font-bold text-foreground">Tankplanner</h2>
        <p className="text-xs text-muted-foreground">Bereken je besparing</p>
      </div>

      {/* Kenteken */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Car className="h-3.5 w-3.5" /> Voertuig
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder="AB-123-CD"
            value={kenteken}
            onChange={(e) => setKenteken(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && lookupKenteken()}
            className="font-mono text-sm uppercase"
          />
          <Button size="sm" onClick={lookupKenteken} disabled={loadingKenteken}>
            {loadingKenteken ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        {vehicle.merk !== 'Onbekend' && (
          <p className="text-xs text-primary">{vehicle.merk} {vehicle.model} • {vehicle.brandstof}</p>
        )}
      </div>

      {/* Verbruik & Tank */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Fuel className="h-3.5 w-3.5" /> Verbruik & Tank
        </Label>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">1 op</span>
            <span className="font-mono text-sm">{vehicle.verbruik} km</span>
          </div>
          <Slider value={[vehicle.verbruik]} onValueChange={([v]) => onVehicleChange({ ...vehicle, verbruik: v })} min={5} max={30} step={0.5} />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">Tankinhoud</span>
            <span className="font-mono text-sm">{vehicle.tankinhoud} L</span>
          </div>
          <Slider value={[vehicle.tankinhoud]} onValueChange={([v]) => onVehicleChange({ ...vehicle, tankinhoud: v })} min={20} max={100} step={5} />
        </div>
      </div>

      {/* Huidige tankstand */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Huidige Tankstand
        </Label>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">Vol</span>
            <span className={`font-mono text-sm font-semibold ${tankColor}`}>
              {currentTankPercent}% · {currentLiters.toFixed(0)} L
            </span>
          </div>
          <Slider value={[currentTankPercent]} onValueChange={([v]) => onTankPercentChange(v)} min={0} max={100} step={5} />
          {currentTankPercent <= 15 && (
            <p className="flex items-center gap-1 text-xs text-red-500">
              <AlertTriangle className="h-3 w-3" /> Tank bijna leeg!
            </p>
          )}
        </div>
      </div>

      {/* Brandstof */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brandstof</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['e5', 'e10', 'diesel'] as const).map((ft) => (
            <button key={ft} onClick={() => onFuelTypeChange(ft)}
              className={`rounded-md px-2 py-1.5 text-xs font-semibold uppercase transition-colors ${fuelType === ft ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'}`}>
              {ft}
            </button>
          ))}
        </div>
      </div>

      {/* NL Prijs */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">NL Prijs (€/L)</Label>
        <Input type="number" step="0.01" value={nlPrice} onChange={(e) => onNlPriceChange(parseFloat(e.target.value) || 0)} className="font-mono" />
      </div>

      {/* Locatie */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Je Locatie</Label>
        <AddressAutocomplete onSelect={(loc) => { onLocationChange(loc); toast.success('Locatie gevonden'); }} />
      </div>

      {/* Loading */}
      {stationsLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {loadingMsg || 'Duitse stations zoeken...'}
        </div>
      )}

      {/* No stations found */}
      {hasLocation && !stationsLoading && stationsCount === 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-yellow-500">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Geen stations gevonden binnen 25 km. Probeer een locatie dichter bij de grens.
          </p>
        </div>
      )}

      {/* Top 3 results */}
      {top3.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top 3 beste opties
          </p>
          {top3.map((ranked) => {
            const s = ranked.station;
            const isSelected = selectedStation?.id === s.id;
            const price = s[fuelType];
            return (
              <button
                key={s.id}
                onClick={() => onSelectStation(s)}
                className={`w-full rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border bg-card hover:border-border/80 hover:bg-accent/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                      <span>{rankLabels[ranked.rank - 1]}</span>
                      <span className="truncate">{s.brand || s.name}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.place} · {(s.dist ?? 0).toFixed(1)} km · via {ranked.crossingName}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-primary">
                        €{price?.toFixed(3)}/L
                      </span>
                      {route && isSelected && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {routeLoading ? '...' : `${route.durationMin} min · ${route.distanceKm} km`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`font-mono text-lg font-bold ${ranked.profit > 0 ? 'text-profit' : 'text-loss'}`}>
                      {ranked.profit > 0 ? '+' : ''}€{ranked.profit.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">besparing</p>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" className="flex-1 gap-1.5 text-xs h-7" onClick={(e) => { e.stopPropagation(); openInMaps(s); }}>
                      <Navigation className="h-3.5 w-3.5" /> Navigeer
                    </Button>
                    {ranked.profit > 0 && (
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={(e) => { e.stopPropagation(); shareResult(ranked); }}>
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!hasLocation && (
        <p className="text-center text-xs text-muted-foreground pt-2">Voer je locatie in om de beste stations te vinden.</p>
      )}
    </div>
  );
}
