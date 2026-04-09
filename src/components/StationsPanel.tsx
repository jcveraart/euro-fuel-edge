import { Navigation, Share2, Clock, Fuel, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { FuelStation } from '@/lib/calculations';
import type { RouteData } from '@/lib/api';
import type { RankedStation } from '@/pages/Dashboard';

interface StationsPanelProps {
  top3: RankedStation[];
  selectedStation: FuelStation | null;
  onSelectStation: (s: FuelStation) => void;
  fuelType: 'e5' | 'e10' | 'diesel';
  route: RouteData | null;
  routeLoading: boolean;
}

export function StationsPanel({
  top3,
  selectedStation,
  onSelectStation,
  fuelType,
  route,
  routeLoading,
}: StationsPanelProps) {
  const openInMaps = (s: FuelStation) =>
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving`,
      '_blank'
    );

  const shareResult = (ranked: RankedStation) => {
    const s = ranked.station;
    navigator.clipboard.writeText(
      `Ik bespaar €${ranked.profit.toFixed(2)} door te tanken bij ${s.brand || s.name} in ${s.place}! 🚗⛽`
    );
    toast.success('Gekopieerd!');
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border px-3 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">Beste opties</h3>
        <p className="text-[10px] text-muted-foreground">Gesorteerd op netto besparing</p>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-1.5 p-2.5">
        {top3.map((ranked, i) => {
          const s = ranked.station;
          const isSelected = selectedStation?.id === s.id;
          const price = s[fuelType];

          return (
            <button
              key={s.id}
              onClick={() => onSelectStation(s)}
              className={`w-full rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? 'border-primary/40 bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:bg-accent/40'
              }`}
            >
              {/* Name + savings */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {i + 1}.
                    </span>
                    <span className="truncate font-semibold leading-tight text-foreground">
                      {s.brand || s.name}
                    </span>
                    <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold ${
                      s.country === 'BE'
                        ? 'bg-yellow-400/20 text-yellow-700 dark:text-yellow-400'
                        : 'bg-blue-500/15 text-blue-700 dark:text-blue-400'
                    }`}>
                      {s.country}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{s.place}</p>
                  <p className="truncate text-[10px] text-muted-foreground/70">
                    via {ranked.crossingName.split(' (')[0]}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`font-mono text-lg font-bold leading-tight ${ranked.profit > 0 ? 'text-profit' : 'text-loss'}`}>
                    {ranked.profit > 0 ? '+' : ''}€{ranked.profit.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">besparing</p>
                </div>
              </div>

              {/* Price + distance + time */}
              <div className="mt-2 flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                  <Fuel className="h-3 w-3" />
                  €{price?.toFixed(3)}/L
                </span>
                <span className="text-xs text-muted-foreground">{(s.dist ?? 0).toFixed(1)} km</span>
                {isSelected && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {routeLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : route ? (
                      `${route.durationMin} min`
                    ) : null}
                  </span>
                )}
              </div>

              {/* Actions */}
              {isSelected && (
                <div className="mt-2.5 flex gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 flex-1 gap-1.5 text-xs"
                    onClick={(e) => { e.stopPropagation(); openInMaps(s); }}
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Navigeer
                  </Button>
                  {ranked.profit > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs"
                      onClick={(e) => { e.stopPropagation(); shareResult(ranked); }}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
