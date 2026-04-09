import { useState, useCallback } from 'react';
import { Search, Car, Fuel, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { fetchRDWData, fetchRDWFuel, fetchTankSize } from '@/lib/api';
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

type VehicleCategory = 'auto' | 'bestelbus' | 'vrachtwagen';
const VEHICLE_DEFAULTS: Record<VehicleCategory, { verbruik: number; tankinhoud: number }> = {
  auto:        { verbruik: 15, tankinhoud: 50 },
  bestelbus:   { verbruik: 10, tankinhoud: 70 },
  vrachtwagen: { verbruik: 5,  tankinhoud: 400 },
};
function detectCategory(s?: string): VehicleCategory {
  if (!s) return 'auto';
  const l = s.toLowerCase();
  if (l.includes('vracht')) return 'vrachtwagen';
  if (l.includes('bestel') || l.includes('bedrijf')) return 'bestelbus';
  return 'auto';
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
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>('auto');

  const applyCategory = (cat: VehicleCategory) => {
    setVehicleCategory(cat);
    onVehicleChange({ ...vehicle, ...VEHICLE_DEFAULTS[cat] });
    if (cat === 'vrachtwagen') onFuelTypeChange('diesel');
  };

  const lookupKenteken = useCallback(async () => {
    if (!kenteken.trim()) return;
    setLoadingKenteken(true);
    try {
      const [rdw, fuel] = await Promise.all([fetchRDWData(kenteken), fetchRDWFuel(kenteken)]);
      if (rdw) {
        const brandstof = fuel.brandstof || rdw.brandstof || 'Benzine';
        const merk = rdw.merk || 'Onbekend';
        const model = rdw.model || 'Onbekend';
        const cat = detectCategory(rdw.voertuigsoort);
        const tankSize = await fetchTankSize(merk, model);
        setVehicleCategory(cat);
        onVehicleChange({
          ...vehicle,
          kenteken: rdw.kenteken || kenteken,
          merk, model, brandstof,
          verbruik: fuel.verbruik ?? VEHICLE_DEFAULTS[cat].verbruik,
          tankinhoud: tankSize ?? VEHICLE_DEFAULTS[cat].tankinhoud,
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
    currentTankPercent <= 15 ? 'text-red-500'
    : currentTankPercent <= 30 ? 'text-yellow-500'
    : 'text-profit';

  const box = 'rounded-xl border border-border bg-background p-2.5';
  const lbl = 'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground';

  return (
    <div className="flex flex-col gap-1.5 p-2.5">

      {/* Location */}
      <div className={box}>
        <Label className={lbl}>Je Locatie</Label>
        <div className="mt-1.5">
          <AddressAutocomplete
            onSelect={(loc) => { onLocationChange(loc); toast.success('Locatie gevonden'); }}
          />
        </div>
      </div>

      {/* Loading / warning */}
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
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {(['auto', 'bestelbus', 'vrachtwagen'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => applyCategory(cat)}
              className={`rounded-lg py-1.5 text-[11px] font-semibold capitalize transition-colors ${
                vehicleCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {cat === 'auto' ? 'Auto' : cat === 'bestelbus' ? 'Bestelbus' : 'Vrachtwagen'}
            </button>
          ))}
        </div>
        {vehicle.merk !== 'Onbekend' && (
          <p className="mt-1 text-xs text-primary">{vehicle.merk} {vehicle.model} · {vehicle.brandstof}</p>
        )}
      </div>

      {/* Rijgegevens: verbruik + tank + tankstand */}
      <div className={box}>
        <Label className={`${lbl} flex items-center gap-1.5`}>
          <Fuel className="h-3 w-3" /> Rijgegevens
        </Label>
        <div className="mt-2 space-y-2.5">
          {/* Verbruik */}
          <div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">1 op</span>
              <span className="font-mono text-xs font-medium">{vehicle.verbruik} km</span>
            </div>
            <Slider
              className="mt-1"
              value={[vehicle.verbruik]}
              onValueChange={([v]) => onVehicleChange({ ...vehicle, verbruik: v })}
              min={vehicleCategory === 'vrachtwagen' ? 1 : 5}
              max={vehicleCategory === 'vrachtwagen' ? 10 : 30}
              step={0.5}
            />
          </div>
          {/* Tankinhoud */}
          <div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Tankinhoud</span>
              <span className="font-mono text-xs font-medium">{vehicle.tankinhoud} L</span>
            </div>
            <Slider
              className="mt-1"
              value={[vehicle.tankinhoud]}
              onValueChange={([v]) => onVehicleChange({ ...vehicle, tankinhoud: v })}
              min={vehicleCategory === 'vrachtwagen' ? 100 : 20}
              max={vehicleCategory === 'vrachtwagen' ? 600 : vehicleCategory === 'bestelbus' ? 120 : 100}
              step={vehicleCategory === 'vrachtwagen' ? 25 : 5}
            />
          </div>
          {/* Tankstand */}
          <div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Huidige stand</span>
              <span className={`font-mono text-xs font-semibold ${tankColor}`}>
                {currentTankPercent}% · {currentLiters.toFixed(0)} L
              </span>
            </div>
            <Slider
              className="mt-1"
              value={[currentTankPercent]}
              onValueChange={([v]) => onTankPercentChange(v)}
              min={0} max={100} step={5}
            />
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
            <button
              key={ft}
              onClick={() => onFuelTypeChange(ft)}
              className={`rounded-lg py-1.5 text-xs font-semibold uppercase transition-colors ${
                fuelType === ft
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {ft}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <Label className={lbl}>NL Prijs (€/L)</Label>
          </div>
          <Input
            type="number"
            step="0.001"
            value={nlPrice}
            onChange={(e) => onNlPriceChange(parseFloat(e.target.value) || 0)}
            className="mt-1 h-8 font-mono text-sm"
          />
        </div>
      </div>

      {!hasLocation && (
        <p className="pt-0.5 text-center text-xs text-muted-foreground">
          Voer je locatie in om te starten.
        </p>
      )}
    </div>
  );
}
