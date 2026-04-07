import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Fuel, ArrowDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchGermanStations, DEFAULT_PRICES, DE_BORDER_POINTS } from '@/lib/api';
import type { FuelStation } from '@/lib/calculations';

export default function LivePrijzen() {
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [fuelType, setFuelType] = useState<'e5' | 'e10' | 'diesel'>('e5');
  const [loading, setLoading] = useState(false);

  const loadStations = async () => {
    setLoading(true);
    const all: FuelStation[] = [];
    const fetches = DE_BORDER_POINTS.map((p) =>
      fetchGermanStations(p.lat, p.lng, 15, fuelType)
    );
    const results = await Promise.all(fetches);
    results.forEach((r) => all.push(...r));
    const unique = Array.from(new Map(all.map((s) => [s.id, s])).values());
    // Sort by price
    unique.sort((a, b) => (a[fuelType] || 99) - (b[fuelType] || 99));
    setStations(unique.slice(0, 20));
    setLoading(false);
  };

  useEffect(() => {
    loadStations();
  }, [fuelType]);

  const nlPrice = DEFAULT_PRICES.nl[fuelType];

  return (
    <div className="min-h-screen pt-14">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground">
            Live <span className="text-primary">Brandstofprijzen</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Top 20 goedkoopste grensstation in Duitsland, real-time via Tankerkönig API
          </p>
        </motion.div>

        {/* Fuel type selector + refresh */}
        <div className="mb-6 flex items-center gap-3">
          {(['e5', 'e10', 'diesel'] as const).map((ft) => (
            <button
              key={ft}
              onClick={() => setFuelType(ft)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold uppercase transition-colors ${
                fuelType === ft
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {ft}
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={loadStations}
            disabled={loading}
            className="ml-auto gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Ververs
          </Button>
        </div>

        {/* Reference prices */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">🇳🇱 Nederland (gem.)</p>
            <p className="font-mono text-2xl font-bold text-foreground">€{nlPrice.toFixed(3)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">🇧🇪 België (gem.)</p>
            <p className="font-mono text-2xl font-bold text-foreground">
              €{DEFAULT_PRICES.be[fuelType].toFixed(3)}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Station
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Plaats
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center justify-end gap-1">
                    Prijs <ArrowDown className="h-3 w-3" />
                  </span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Besparing/L
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Op 50L
                </th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s, i) => {
                const price = s[fuelType];
                if (!price) return null;
                const saving = nlPrice - price;
                const savingTank = saving * 50;
                return (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border/50 transition-colors hover:bg-accent/50"
                  >
                    <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Fuel className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">
                          {s.brand || s.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.place}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-foreground">
                      €{price.toFixed(3)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-sm font-semibold ${
                        saving > 0 ? 'text-profit' : 'text-loss'
                      }`}
                    >
                      {saving > 0 ? '-' : '+'}€{Math.abs(saving).toFixed(3)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-sm font-bold ${
                        savingTank > 0 ? 'text-profit' : 'text-loss'
                      }`}
                    >
                      €{savingTank.toFixed(2)}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          {loading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Laden...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
