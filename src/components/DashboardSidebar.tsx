import { useState, useCallback } from 'react';
import { Search, Car, Fuel, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { fetchRDWData, fetchRDWFuel, fetchTankSize, DEFAULT_PRICES } from '@/lib/api';
import type { VehicleData } from '@/lib/calculations';
import { toast } from 'sonner';

interface DashboardSidebarProps {
  vehicle: VehicleData;
  fuelType: 'e5' | 'e10' | 'diesel';
  nlPrice: number;
  currentTankPercent: number;
  currentLiters: number;
  hasLocation: boolean;
  stationsLoading: boolean;
  stationsCount: number;
  loadingMsg?: string;
  onVehicleChange: (v: VehicleData) => void;
  onLocationChange: (loc: { lat: number; lng: number; display: string }) => void;
  onFuelTypeChange: (type: 'e5' | 'e10' | 'diesel') => void;
  onNlPriceChange: (price: number) => void;
  onTankPercentChange: (pct: number) => void;
}

export function DashboardSidebar({
  vehicle,
  fuelType,
  nlPrice,
  currentTankPercent,
  currentLiters,
  hasLocation,
  stationsLoading,
  stationsCount,
  loadingMsg,
  onVehicleChange,
  onLocationChange,
  onFuelTypeChange,
  onNlPriceChange,
  onTankPercentChange,
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

  const tankColor =
    currentTankPercent <= 15
      ? 'text-red-500'
      : currentTankPercent <= 30
      ? 'text-yellow-500'
      : 'text-profit';

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="space-y-0.5 pb-1">
        <h2 className="text-base font-bold text-foreground">Tankplanner</h2>
        <p className="text-xs text-muted-foreground">Bereken je besparing</p>
      </div>

      {/* Location — at top (takes longest to load) */}
      <div className="space-y-2 rounded-xl border border-border bg-background p-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Je Locatie
        </Label>
        <AddressAutocomplete
          onSelect={(loc) => {
            onLocationChange(loc);
            toast.success('Locatie gevonden');
          }}
        />
      </div>

      {/* Loading progress */}
      {stationsLoading && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          {loadingMsg || 'Stations zoeken...'}
        </div>
      )}

      {/* No stations warning */}
      {hasLocation && !stationsLoading && stationsCount === 0 && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
          <p className="flex items-center gap-2 text-xs font-medium text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Geen stations gevonden. Probeer een locatie dichter bij de grens.
          </p>
        </div>
      )}

      {/* Kenteken */}
      <div className="space-y-2 rounded-xl border border-border bg-background p-3">
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
            {loadingKenteken ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        {vehicle.merk !== 'Onbekend' && (
          <p className="text-xs text-primary">
            {vehicle.merk} {vehicle.model} · {vehicle.brandstof}
          </p>
        )}
      </div>

      {/* Verbruik & Tank */}
      <div className="space-y-3 rounded-xl border border-border bg-background p-3">
        <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Fuel className="h-3.5 w-3.5" /> Verbruik & Tank
        </Label>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">1 op</span>
            <span className="font-mono text-sm">{vehicle.verbruik} km</span>
          </div>
          <Slider
            value={[vehicle.verbruik]}
            onValueChange={([v]) => onVehicleChange({ ...vehicle, verbruik: v })}
            min={5} max={30} step={0.5}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">Tankinhoud</span>
            <span className="font-mono text-sm">{vehicle.tankinhoud} L</span>
          </div>
          <Slider
            value={[vehicle.tankinhoud]}
            onValueChange={([v]) => onVehicleChange({ ...vehicle, tankinhoud: v })}
            min={20} max={100} step={5}
          />
        </div>
      </div>

      {/* Current tank level */}
      <div className="space-y-2 rounded-xl border border-border bg-background p-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Huidige Tankstand
        </Label>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">Vol</span>
            <span className={`font-mono text-sm font-semibold ${tankColor}`}>
              {currentTankPercent}% · {currentLiters.toFixed(0)} L
            </span>
          </div>
          <Slider
            value={[currentTankPercent]}
            onValueChange={([v]) => onTankPercentChange(v)}
            min={0} max={100} step={5}
          />
          {currentTankPercent <= 15 && (
            <p className="flex items-center gap-1 text-xs text-red-500">
              <AlertTriangle className="h-3 w-3" /> Tank bijna leeg!
            </p>
          )}
        </div>
      </div>

      {/* Fuel type */}
      <div className="space-y-2 rounded-xl border border-border bg-background p-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Brandstof
        </Label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['e5', 'e10', 'diesel'] as const).map((ft) => (
            <button
              key={ft}
              onClick={() => onFuelTypeChange(ft)}
              className={`rounded-lg px-2 py-1.5 text-xs font-semibold uppercase transition-colors ${
                fuelType === ft
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {ft}
            </button>
          ))}
        </div>
      </div>

      {/* NL price */}
      <div className="space-y-2 rounded-xl border border-border bg-background p-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          NL Prijs (€/L)
        </Label>
        <Input
          type="number"
          step="0.01"
          value={nlPrice}
          onChange={(e) => onNlPriceChange(parseFloat(e.target.value) || 0)}
          className="font-mono"
        />
      </div>

      {!hasLocation && (
        <p className="pt-1 text-center text-xs text-muted-foreground">
          Voer je locatie in om te starten.
        </p>
      )}
    </div>
  );
}
