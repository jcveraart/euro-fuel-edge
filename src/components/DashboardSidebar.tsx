import { useState, useCallback } from 'react';
import { Search, Car, Fuel, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { fetchRDWData, fetchRDWFuel, fetchTankSize, DEFAULT_PRICES } from '@/lib/api';
import type { VehicleData } from '@/lib/calculations';
import { toast } from 'sonner';

interface DashboardSidebarProps {
  onVehicleChange: (v: VehicleData) => void;
  onLocationChange: (loc: { lat: number; lng: number; display: string }) => void;
  onFuelTypeChange: (type: 'e5' | 'e10' | 'diesel') => void;
  onNlPriceChange: (price: number) => void;
  vehicle: VehicleData;
  fuelType: 'e5' | 'e10' | 'diesel';
  nlPrice: number;
  netProfit: number | null;
  bestStation: string | null;
}

export function DashboardSidebar({
  onVehicleChange,
  onLocationChange,
  onFuelTypeChange,
  onNlPriceChange,
  vehicle,
  fuelType,
  nlPrice,
  netProfit,
  bestStation,
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
        // Auto-select fuel type
        if (brandstof.toLowerCase().includes('diesel')) {
          onFuelTypeChange('diesel');
        }
        toast.success(`${rdw.merk} ${rdw.model} gevonden!`);
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
    if (netProfit !== null && netProfit > 0) {
      const text = `Ik bespaar vandaag €${netProfit.toFixed(2)} door te tanken bij ${bestStation || 'een station'} over de grens! 🚗⛽ #GrensTankerPro`;
      navigator.clipboard.writeText(text);
      toast.success('Resultaat gekopieerd!');
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto p-4">
      <div className="space-y-1">
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

      {/* Verbruik */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Fuel className="h-3.5 w-3.5" /> Verbruik & Tank
        </Label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">1 op</span>
            <span className="font-mono text-sm text-foreground">{vehicle.verbruik} km</span>
          </div>
          <Slider
            value={[vehicle.verbruik]}
            onValueChange={([v]) => onVehicleChange({ ...vehicle, verbruik: v })}
            min={5}
            max={30}
            step={0.5}
            className="py-1"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tankinhoud</span>
            <span className="font-mono text-sm text-foreground">{vehicle.tankinhoud} L</span>
          </div>
          <Slider
            value={[vehicle.tankinhoud]}
            onValueChange={([v]) => onVehicleChange({ ...vehicle, tankinhoud: v })}
            min={20}
            max={100}
            step={5}
            className="py-1"
          />
        </div>
      </div>

      {/* Brandstoftype */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Brandstof
        </Label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['e5', 'e10', 'diesel'] as const).map((ft) => (
            <button
              key={ft}
              onClick={() => onFuelTypeChange(ft)}
              className={`rounded-md px-2 py-1.5 text-xs font-semibold uppercase transition-colors ${
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

      {/* NL Prijs */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
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

      {/* Locatie */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Je Locatie
        </Label>
        <AddressAutocomplete onSelect={handleLocationSelect} />
      </div>

      {/* Resultaat */}
      {netProfit !== null && (
        <div
          className={`rounded-lg border p-3 ${
            netProfit > 0
              ? 'border-profit/30 bg-profit/5 glow-profit'
              : 'border-loss/30 bg-loss/5'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Netto Besparing
          </p>
          <p className={`font-mono text-2xl font-bold ${netProfit > 0 ? 'text-profit' : 'text-loss'}`}>
            €{netProfit.toFixed(2)}
          </p>
          {bestStation && (
            <p className="mt-1 text-xs text-muted-foreground">Beste station: {bestStation}</p>
          )}
          {netProfit > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
              onClick={shareResult}
            >
              <Share2 className="h-3.5 w-3.5" /> Deel Resultaat
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
