import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
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

const profitIcon = new L.DivIcon({
  html: '<div style="background:#22c55e;width:10px;height:10px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px #22c55e80"></div>',
  className: '',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const lossIcon = new L.DivIcon({
  html: '<div style="background:#ef4444;width:8px;height:8px;border-radius:50%;border:2px solid #fff;opacity:0.5"></div>',
  className: '',
  iconSize: [8, 8],
  iconAnchor: [4, 4],
});

const bestIcon = new L.DivIcon({
  html: `<div style="background:#f59e0b;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 14px #f59e0b;display:flex;align-items:center;justify-content:center;">
    <div style="width:6px;height:6px;background:#fff;border-radius:50%"></div>
  </div>`,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const userIcon = new L.DivIcon({
  html: '<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 12px #3b82f680"></div>',
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function hasValidCoordinates(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function MapController({ center, route }: { center: [number, number]; route: RouteData | null }) {
  const map = useMap();
  useEffect(() => {
    if (route && route.coordinates.length > 0) {
      const bounds = L.latLngBounds(route.coordinates.map((c) => L.latLng(c[0], c[1])));
      map.fitBounds(bounds, { paddingTopLeft: [400, 60], paddingBottomRight: [60, 60] });
    } else {
      map.flyTo(center, center[0] === 52.2 ? 8 : 10, { duration: 1.2 });
    }
  }, [center, route, map]);
  return null;
}

interface FuelMapProps {
  stations: FuelStation[];
  userLocation: { lat: number; lng: number } | null;
  fuelType: 'e5' | 'e10' | 'diesel';
  nlPrice: number;
  consumption: number;
  tankSize: number;
  currentLiters: number;
  bestStation: FuelStation | null;
  route: RouteData | null;
}

export function FuelMap({
  stations,
  userLocation,
  fuelType,
  nlPrice,
  consumption,
  tankSize,
  currentLiters,
  bestStation,
  route,
}: FuelMapProps) {
  const safeUserLocation =
    userLocation && hasValidCoordinates(userLocation.lat, userLocation.lng)
      ? userLocation
      : null;

  const center: [number, number] = safeUserLocation
    ? [safeUserLocation.lat, safeUserLocation.lng]
    : [52.2, 5.5];

  const stationsWithProfit = useMemo(() => {
    return stations
      .filter((s) => hasValidCoordinates(s.lat, s.lng))
      .map((s) => {
        const price = s[fuelType];
        if (!price || !safeUserLocation) return { ...s, profit: 0 };
        const dist = s.dist ?? 10;
        const profit = calculateNetProfit(nlPrice, price, tankSize, dist, consumption, currentLiters);
        return { ...s, profit };
      });
  }, [stations, fuelType, nlPrice, tankSize, consumption, currentLiters, safeUserLocation]);

  return (
    <MapContainer center={center} zoom={8} className="h-full w-full" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapController center={center} route={route} />

      {safeUserLocation && (
        <>
          <Marker position={[safeUserLocation.lat, safeUserLocation.lng]} icon={userIcon}>
            <Popup><span className="text-sm font-semibold">Jouw locatie</span></Popup>
          </Marker>
          <Circle
            center={[safeUserLocation.lat, safeUserLocation.lng]}
            radius={40000}
            pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.03, weight: 1, opacity: 0.15 }}
          />
        </>
      )}

      {/* Route polyline */}
      {route && route.coordinates.length > 0 && (
        <Polyline
          positions={route.coordinates}
          pathOptions={{ color: '#f59e0b', weight: 4, opacity: 0.85, dashArray: undefined }}
        />
      )}

      {/* Station markers */}
      {stationsWithProfit.map((s) => {
        const price = s[fuelType];
        if (!price) return null;
        const isBest = bestStation?.id === s.id;
        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={isBest ? bestIcon : s.profit > 0 ? profitIcon : lossIcon}
            zIndexOffset={isBest ? 1000 : 0}
          >
            <Popup>
              <div style={{ color: '#111', minWidth: 170 }}>
                <p style={{ fontWeight: 700, margin: 0 }}>
                  {isBest && '⭐ '}{s.brand || s.name}
                </p>
                <p style={{ fontSize: 12, margin: '2px 0', color: '#666' }}>
                  {s.street}, {s.place}
                </p>
                <p style={{ fontSize: 14, fontWeight: 600, margin: '4px 0 0' }}>
                  {fuelType.toUpperCase()}: €{price.toFixed(3)}/L
                </p>
                {s.dist && (
                  <p style={{ fontSize: 12, color: '#666' }}>{s.dist.toFixed(1)} km afstand</p>
                )}
                <p style={{ fontSize: 14, fontWeight: 700, color: s.profit > 0 ? '#22c55e' : '#ef4444', marginTop: 4 }}>
                  Netto: €{s.profit.toFixed(2)}
                </p>
                {isBest && (
                  <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>✓ Beste optie voor jou</p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
