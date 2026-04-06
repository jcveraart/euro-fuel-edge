import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { FuelStation } from '@/lib/calculations';
import { calculateNetProfit } from '@/lib/calculations';
import type { RouteData } from '@/lib/api';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const makeIcon = (color: string, size: number, glow?: string) =>
  new L.DivIcon({
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px ${glow ?? color + '80'}"></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const profitIcon = makeIcon('#22c55e', 11);
const lossIcon   = new L.DivIcon({
  html: '<div style="background:#ef4444;width:8px;height:8px;border-radius:50%;border:2px solid #fff;opacity:0.45"></div>',
  className: '',
  iconSize: [8, 8],
  iconAnchor: [4, 4],
});
const bestIcon = new L.DivIcon({
  html: `<div style="background:#f59e0b;width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 16px #f59e0b;display:flex;align-items:center;justify-content:center;">
    <div style="width:6px;height:6px;background:#fff;border-radius:50%"></div>
  </div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});
const userIcon = new L.DivIcon({
  html: '<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 12px #3b82f6"></div>',
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function hasValidCoords(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function MapController({ userLat, userLng, route }: { userLat: number | null; userLng: number | null; route: RouteData | null }) {
  const map = useMap();
  useEffect(() => {
    if (route && route.coordinates.length > 1) {
      const bounds = L.latLngBounds(route.coordinates.map((c) => L.latLng(c[0], c[1])));
      map.fitBounds(bounds, { paddingTopLeft: [420, 60], paddingBottomRight: [60, 60] });
    } else if (userLat !== null && userLng !== null) {
      map.flyTo([userLat, userLng], 11, { duration: 1.2 });
    }
  }, [userLat, userLng, route, map]);
  return null;
}

interface FuelMapProps {
  stations: FuelStation[];        // top 3
  allStations: FuelStation[];     // closest 10 (shown dimmed)
  userLocation: { lat: number; lng: number } | null;
  fuelType: 'e5' | 'e10' | 'diesel';
  nlPrice: number;
  consumption: number;
  tankSize: number;
  currentLiters: number;
  selectedStation: FuelStation | null;
  onStationClick: (s: FuelStation) => void;
  route: RouteData | null;
  loading: boolean;
}

export function FuelMap({
  stations,
  allStations,
  userLocation,
  fuelType,
  nlPrice,
  consumption,
  tankSize,
  currentLiters,
  selectedStation,
  onStationClick,
  route,
  loading,
}: FuelMapProps) {
  const safeUser = userLocation && hasValidCoords(userLocation.lat, userLocation.lng) ? userLocation : null;
  const defaultCenter: [number, number] = [52.2, 5.5];

  const top3WithProfit = useMemo(() =>
    stations
      .filter((s) => hasValidCoords(s.lat, s.lng))
      .map((s) => {
        const price = s[fuelType];
        const profit = price && safeUser
          ? calculateNetProfit(nlPrice, price, tankSize, s.dist ?? 10, consumption, currentLiters)
          : 0;
        return { ...s, profit };
      }),
    [stations, fuelType, nlPrice, tankSize, consumption, currentLiters, safeUser]
  );

  // Dimmed markers for the other closest stations not in top 3
  const top3Ids = new Set(stations.map((s) => s.id));
  const otherStations = allStations.filter(
    (s) => !top3Ids.has(s.id) && hasValidCoords(s.lat, s.lng)
  );

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute left-4 top-4 z-[1000] rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          Stations laden...
        </div>
      )}
      <MapContainer center={defaultCenter} zoom={8} className="h-full w-full" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <MapController
          userLat={safeUser?.lat ?? null}
          userLng={safeUser?.lng ?? null}
          route={route}
        />

        {/* User location */}
        {safeUser && (
          <Marker position={[safeUser.lat, safeUser.lng]} icon={userIcon}>
            <Popup><span style={{ fontWeight: 700 }}>Jouw locatie</span></Popup>
          </Marker>
        )}

        {/* Route line */}
        {route && route.coordinates.length > 1 && (
          <Polyline
            positions={route.coordinates}
            pathOptions={{ color: '#f59e0b', weight: 4, opacity: 0.9 }}
          />
        )}

        {/* Dimmed markers for other closest stations */}
        {otherStations.map((s) => {
          const price = s[fuelType];
          if (!price) return null;
          return (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={lossIcon} eventHandlers={{ click: () => onStationClick(s) }}>
              <Popup>
                <div style={{ color: '#111', minWidth: 160 }}>
                  <p style={{ fontWeight: 700, margin: 0 }}>{s.brand || s.name}</p>
                  <p style={{ fontSize: 12, color: '#666' }}>{s.place} · {(s.dist ?? 0).toFixed(1)} km</p>
                  <p style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{fuelType.toUpperCase()}: €{price.toFixed(3)}/L</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Top 3 markers */}
        {top3WithProfit.map((s, i) => {
          const price = s[fuelType];
          if (!price) return null;
          const isSelected = selectedStation?.id === s.id;
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <Marker
              key={s.id}
              position={[s.lat, s.lng]}
              icon={isSelected ? bestIcon : profitIcon}
              zIndexOffset={isSelected ? 1000 : 100}
              eventHandlers={{ click: () => onStationClick(s) }}
            >
              <Popup>
                <div style={{ color: '#111', minWidth: 180 }}>
                  <p style={{ fontWeight: 700, margin: 0 }}>{medals[i]} {s.brand || s.name}</p>
                  <p style={{ fontSize: 12, color: '#555', margin: '2px 0 0' }}>{s.street}, {s.place}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: '6px 0 2px' }}>{fuelType.toUpperCase()}: €{price.toFixed(3)}/L</p>
                  <p style={{ fontSize: 12, color: '#666' }}>{(s.dist ?? 0).toFixed(1)} km</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: s.profit > 0 ? '#22c55e' : '#ef4444', marginTop: 4 }}>
                    Netto: €{s.profit.toFixed(2)}
                  </p>
                  {isSelected && <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>✓ Geselecteerd</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
