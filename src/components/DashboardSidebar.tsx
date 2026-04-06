import { useState, useCallback } from 'react';
import { Search, Car, Fuel, Loader2, Share2, Navigation, AlertTriangle, Clock, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { fetchRDWData, fetchRDWFuel, fetchTankSize, DEFAULT_PRICES, type RouteData } from '@/lib/api';
import type { FuelStation, VehicleData } from '@/lib/calculations';
import { toast } from 'sonner';

interface DashboardSidebarProps {
  onVehicleChange: (v: VehicleData) => void;
  onLocationChange: (loc: { lat: number; lng: number; display: string }) => void;
  onFuelTypeChange: (type: 'e5' | 'e10' | 'diesel') => void;
  onNlPriceChange: (price: number) => void;
  onTankPercentChange: (pct: number) => void;
  vehicle: VehicleData;
  fuelType: 'e5' | 'e10' | 'diesel';
  nlPrice: number;
  currentTankPercent: number;
  currentLiters: number;
  netProfit: number | null;
  bestStation: FuelStation | null;
  route: RouteData | null;
  routeLoading: boolean;
  reachableCount: number;
  stationsCount: number;
  hasLocation: boolean;
  stationsLoading: boolean;
}

export function DashboardSidebar({
  onVehicleChange,
  onLocationChange,
  onFuelTypeChange,
  onNlPriceChange,
  onTankPercentChange,
  vehicle,
  fuelType,
  nlPrice,
  currentTankPercent,
  currentLiters,
  netProfit,
  bestStation,
  route,
  routeLoading,
  reachableCount,
  stationsCount,
  hasLocation,
  stationsLoading,
}: DashboardSidebarProps) {
  const [kenteken, setKenteken] = useState('');
  const [loadingKenteken, setLoadingKenteken] = useState(false);

  const lookupKenteken = useCallback(async () => {
    if (!kenteken.trim()) return;
    setLoadingKenteken(true);
    try {
      const [rdw, fuel] = await Promise.all([
        fetchRDWData(kenteken),
        fetchRDWFuel(kenteken),
      ]);
      if (rdw) {
        const brandstof = fuel.brandstof || rdw.brandstof || 'Benzine';
        const merk = rdw.merk || 'Onbekend';
        const model = rdw.model || 'Onbekend';
        const tankSize = await fetchTankSize(merk, model);
        onVehicleChange({
          ...vehicle,
          kenteken: rdw.kenteken || kenteken,
          merk,
          model,
          brandstof,
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

  const handleLocationSelect = useCallback((loc: { lat: number; lng: number; display: string }) => {
    onLocationChange(loc);
    toast.success('Locatie gevonden');
  }, [onLocationChange]);

  const shareResult = () => {
    if (netProfit !== null && netProfit > 0 && bestStation) {
      const text = `Ik bespaar €${netProfit.toFixed(2)} door te tanken bij ${bestStation.brand || bestStation.name} in ${bestStation.place}! 🚗⛽ #GrensTanker`;
      navigator.clipboard.writeText(text);
      toast.success('Resultaat gekopieerd!');
    }
  };

  const openInMaps = () => {
    if (bestStation) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${bestStation.lat},${bestStation.lng}&travelmode=driving`, '_blank');
    }
  };

  // Fuel level color
  const tankColor = currentTankPercent <= 15 ? 'text-red-500' : currentTankPercent <= 30 ? 'text-yellow-500' : 'text-profit';

  const noStationsFound = hasLocation && !stationsLoading && stationsCount === 0;
  const noReachableStations = hasLocation && !stationsLoading && stationsCount > 0 && reachableCount === 0;
  const noLocation = !hasLocation;

  return (
    <div className="flex h-full w-full flex-col gap-3 overflow-y-auto p-4">
      <div className="space-y-0.5">
        <h2 className="text-lg font-bold text-foreground">Tankplanner</h2>
        <p className="text-xs text-muted-foreground">Bereken je besparing</p>
      </div>

      {/* Kenteken Lookup */}
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
          <p className="text-xs text-primary">
            {vehicle.merk} {vehicle.model} • {vehicle.brandstof}
          </p>
        )}
      </div>

      {/* Verbruik & Tank */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Fuel className="h-3.5 w-3.5" /> Verbruik & Tank
        </Label>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">1 op</span>
            <span className="font-mono text-sm text-foreground">{vehicle.verbruik} km</span>
          </div>
          <Slider value={[vehicle.verbruik]} onValueChange={([v]) => onVehicleChange({ ...vehicle, verbruik: v })} min={5} max={30} step={0.5} className="py-1" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tankinhoud</span>
            <span className="font-mono text-sm text-foreground">{vehicle.tankinhoud} L</span>
          </div>
          <Slider value={[vehicle.tankinhoud]} onValueChange={([v]) => onVehicleChange({ ...vehicle, tankinhoud: v })} min={20} max={100} step={5} className="py-1" />
        </div>
      </div>

      {/* Huidige tankstand */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Huidige Tankstand
        </Label>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Vol</span>
            <span className={`font-mono text-sm font-semibold ${tankColor}`}>
              {currentTankPercent}% &nbsp;·&nbsp; {currentLiters.toFixed(0)} L
            </span>
          </div>
          <Slider
            value={[currentTankPercent]}
            onValueChange={([v]) => onTankPercentChange(v)}
            min={0}
            max={100}
            step={5}
            className="py-1"
          />
          {currentTankPercent <= 15 && (
            <p className="flex items-center gap-1 text-xs text-red-500">
              <AlertTriangle className="h-3 w-3" /> Tank bijna leeg!
            </p>
          )}
        </div>
      </div>

      {/* Brandstoftype */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brandstof</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['e5', 'e10', 'diesel'] as const).map((ft) => (
            <button
              key={ft}
              onClick={() => onFuelTypeChange(ft)}
              className={`rounded-md px-2 py-1.5 text-xs font-semibold uppercase transition-colors ${
                fuelType === ft ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
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
        <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Je Locatie
        </Label>
        <AddressAutocomplete onSelect={handleLocationSelect} />
      </div>

      {/* Stations loading */}
      {stationsLoading && hasLocation && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Duitse stations zoeken...
        </div>
      )}

      {/* Error: no stations found near location */}
      {noStationsFound && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-yellow-500">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Geen Duitse stations gevonden binnen 25 km. Probeer een andere locatie.
          </p>
        </div>
      )}

      {/* Error: can't reach any station */}
      {noReachableStations && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-red-500">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Te weinig brandstof om een Duits station te bereiken. Vul eerst bij in Nederland.
          </p>
        </div>
      )}

      {/* Route result */}
      {(bestStation || routeLoading) && !noReachableStations && (
        <div className={`rounded-lg border p-3 ${netProfit && netProfit > 0 ? 'border-profit/30 bg-profit/5' : 'border-border bg-card'}`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Beste Route
          </p>

          {routeLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Route berekenen...
            </div>
          ) : bestStation && (
            <>
              <p className="font-semibold text-foreground">{bestStation.brand || bestStation.name}</p>
              <p className="text-xs text-muted-foreground">{bestStation.street}, {bestStation.place}</p>
              <p className="mt-1 text-sm font-mono font-bold text-primary">
                {bestStation[fuelType] ? `€${bestStation[fuelType]!.toFixed(3)}/L` : '—'}
              </p>

              {route && (
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Route className="h-3.5 w-3.5" />
                    {route.distanceKm} km
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    ~{route.durationMin} min
                  </span>
                </div>
              )}

              {netProfit !== null && (
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Netto besparing</p>
                    <p className={`font-mono text-xl font-bold ${netProfit > 0 ? 'text-profit' : 'text-loss'}`}>
                      €{netProfit.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button size="sm" onClick={openInMaps} className="gap-1.5 text-xs">
                      <Navigation className="h-3.5 w-3.5" /> Navigeer
                    </Button>
                    {netProfit > 0 && (
                      <Button size="sm" variant="outline" onClick={shareResult} className="gap-1.5 border-border text-xs">
                        <Share2 className="h-3.5 w-3.5" /> Deel
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {noLocation && (
        <p className="text-center text-xs text-muted-foreground">Voer je locatie in om de beste route te berekenen.</p>
      )}
    </div>
  );
}
