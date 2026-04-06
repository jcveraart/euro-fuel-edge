import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Info, AlertTriangle, ShoppingCart, Fuel } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateBreakeven } from '@/lib/calculations';

export default function BesparingsGids() {
  const [kortingPerLiter, setKortingPerLiter] = useState(0.2);
  const [tankinhoud, setTankinhoud] = useState(50);
  const [brandstofprijs, setBrandstofprijs] = useState(1.75);
  const [verbruik, setVerbruik] = useState(15);

  const breakeven = calculateBreakeven(kortingPerLiter, tankinhoud, brandstofprijs, verbruik);

  return (
    <div className="min-h-screen pt-14">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-foreground">
            Besparings-<span className="text-primary">Gids</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Alles wat je moet weten over tanken over de grens
          </p>
        </motion.div>

        {/* Break-even Calculator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8 rounded-xl border border-primary/20 bg-card p-6 glow-profit"
        >
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Calculator className="h-5 w-5 text-primary" />
            Break-even Calculator
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hoeveel kilometer mag je maximaal omrijden voordat de besparing verdwijnt?
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Korting per liter (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={kortingPerLiter}
                onChange={(e) => setKortingPerLiter(parseFloat(e.target.value) || 0)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tankinhoud (L)</Label>
              <Input
                type="number"
                value={tankinhoud}
                onChange={(e) => setTankinhoud(parseFloat(e.target.value) || 0)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Brandstofprijs station (€/L)</Label>
              <Input
                type="number"
                step="0.01"
                value={brandstofprijs}
                onChange={(e) => setBrandstofprijs(parseFloat(e.target.value) || 0)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Verbruik (1 op X km)</Label>
              <Input
                type="number"
                value={verbruik}
                onChange={(e) => setVerbruik(parseFloat(e.target.value) || 0)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-primary/10 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Maximale enkele-reis afstand
            </p>
            <p className="font-mono text-3xl font-bold text-primary">
              {breakeven.toFixed(1)} km
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Verder rijden? Dan kost het je meer dan het oplevert.
            </p>
          </div>
        </motion.div>

        {/* Guide Sections */}
        <div className="mt-8 space-y-6">
          <Section
            icon={<Info className="h-5 w-5 text-primary" />}
            title="Waarom loont het om over de grens te tanken?"
            delay={0.2}
          >
            <p>
              De accijnzen op brandstof in Nederland behoren tot de hoogste van Europa. In Duitsland
              en België betaal je aanzienlijk minder per liter. Het verschil kan oplopen tot €0,30
              per liter, wat bij een volle tank van 50 liter al snel €15 scheelt.
            </p>
            <p className="mt-2">
              <strong>Vuistregel:</strong> Woon je binnen 30 km van de grens? Dan loont het bijna
              altijd om over de grens te tanken, zelfs als je speciaal rijdt.
            </p>
          </Section>

          <Section
            icon={<AlertTriangle className="h-5 w-5 text-warning" />}
            title="Waar moet je op letten in Duitsland?"
            delay={0.3}
          >
            <ul className="list-inside list-disc space-y-2">
              <li>
                <strong>Umweltplakette:</strong> In veel Duitse steden heb je een milieusticker
                nodig. Zonder sticker riskeer je een boete van €80. Bestel er één online voor ~€5.
              </li>
              <li>
                <strong>E10 vs E5:</strong> E10 bevat 10% bio-ethanol en is goedkoper, maar niet
                alle auto's zijn geschikt. Check je tankdop of handleiding.
              </li>
              <li>
                <strong>Betalen:</strong> Bij de meeste Duitse tankstations betaal je eerst binnen
                en tank je daarna. Pin wordt overal geaccepteerd.
              </li>
              <li>
                <strong>Snelheid:</strong> Op de Autobahn geldt vaak geen snelheidslimiet, maar
                rond tankstations en in steden wel. Let op de borden!
              </li>
            </ul>
          </Section>

          <Section
            icon={<ShoppingCart className="h-5 w-5 text-primary" />}
            title="Extra besparen: combineer met boodschappen"
            delay={0.4}
          >
            <p>
              Maak er een efficiënte rit van! Veel grensgebieden hebben grote supermarkten waar
              producten als koffie, bier, frisdrank en zuivel fors goedkoper zijn.
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                <strong>Koffie:</strong> Tot 40% goedkoper in Duitse supermarkten (Aldi, Lidl, Kaufland)
              </li>
              <li>
                <strong>Bier & frisdrank:</strong> Let op het Pfand (statiegeld) systeem
              </li>
              <li>
                <strong>Maximaal meenemen:</strong> Er is geen limiet voor persoonlijk gebruik binnen de EU
              </li>
            </ul>
          </Section>

          <Section
            icon={<Fuel className="h-5 w-5 text-primary" />}
            title="Tips voor maximale besparing"
            delay={0.5}
          >
            <ul className="list-inside list-disc space-y-2">
              <li>
                <strong>Tank op maandag of dinsdag:</strong> Prijzen zijn in Duitsland het laagst
                aan het begin van de week, vooral 's avonds tussen 18:00-20:00.
              </li>
              <li>
                <strong>Vermijd snelwegstations:</strong> Tankstations direct aan de Autobahn zijn
                vaak 10-15 cent duurder. Rijd de afrit af!
              </li>
              <li>
                <strong>Gebruik deze app:</strong> Check altijd de actuele prijzen voordat je gaat,
                want ze veranderen meerdere keren per dag.
              </li>
              <li>
                <strong>Tankpas:</strong> Sommige Duitse stations bieden korting met een tankpas
                (bijv. DKV, Shell Card).
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  delay,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
        {icon}
        {title}
      </h2>
      <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </motion.div>
  );
}
