import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { FuelStation } from '@/lib/calculations';
import { calculateNetProfit } from '@/lib/calculations';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const profitIcon = new L.DivIcon({
  html: '<div style="background:#22c55e;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px #22c55e80"></div>',
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const lossIcon = new L.DivIcon({
  html: '<div style="background:#ef4444;width:10px;height:10px;border-radius:50%;border:2px solid #fff;opacity:0.6"></div>',
  className: '',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
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

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 10, { duration: 1.5 });
  }, [center, map]);
  return null;
}

interface FuelMapProps {
  stations: FuelStation[];
  userLocation: { lat: number; lng: number } | null;
  fuelType: 'e5' | 'e10' | 'diesel';
  nlPrice: number;
  consumption: number;
  tankSize: number;
  onStationClick?: (station: FuelStation) => void;
}

export function FuelMap({
  stations,
  userLocation,
  fuelType,
  nlPrice,
  consumption,
  tankSize,
  onStationClick,
}: FuelMapProps) {
  const safeUserLocation =
    userLocation && hasValidCoordinates(userLocation.lat, userLocation.lng)
      ? userLocation
      : null;

  const center: [number, number] = safeUserLocation
    ? [safeUserLocation.lat, safeUserLocation.lng]
    : [52.2, 5.5]; // Default: center of the Netherlands

  const stationsWithProfit = useMemo(() => {
    return stations
      .filter((s) => hasValidCoordinates(s.lat, s.lng))
      .map((s) => {
      const price = s[fuelType];
      if (!price || !safeUserLocation) return { ...s, profit: 0 };
      const dist = s.dist || 10;
      const profit = calculateNetProfit(nlPrice, price, tankSize, dist, consumption);
      return { ...s, profit };
      });
  }, [stations, fuelType, nlPrice, tankSize, consumption, safeUserLocation]);

  return (
    <MapContainer
      center={center}
      zoom={7}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapUpdater center={center} />

      {safeUserLocation && (
        <>
          <Marker position={[safeUserLocation.lat, safeUserLocation.lng]} icon={userIcon}>
            <Popup>
              <span className="text-sm font-semibold">Jouw locatie</span>
            </Popup>
          </Marker>
          {/* Profitable zone circle */}
          <Circle
            center={[safeUserLocation.lat, safeUserLocation.lng]}
            radius={40000}
            pathOptions={{
              color: '#22c55e',
              fillColor: '#22c55e',
              fillOpacity: 0.03,
              weight: 1,
              opacity: 0.2,
            }}
          />
        </>
      )}

      {stationsWithProfit.map((s) => {
        const price = s[fuelType];
        if (!price) return null;
        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={s.profit > 0 ? profitIcon : lossIcon}
            eventHandlers={{
              click: () => onStationClick?.(s),
            }}
          >
            <Popup>
              <div style={{ color: '#111', minWidth: 160 }}>
                <p style={{ fontWeight: 700, margin: 0 }}>{s.brand || s.name}</p>
                <p style={{ fontSize: 12, margin: '2px 0', color: '#666' }}>
                  {s.street}, {s.place}
                </p>
                <p style={{ fontSize: 14, fontWeight: 600, margin: '4px 0 0' }}>
                  {fuelType.toUpperCase()}: €{price.toFixed(3)}
                </p>
                {s.dist && (
                  <p style={{ fontSize: 12, color: '#666' }}>{s.dist.toFixed(1)} km afstand</p>
                )}
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: s.profit > 0 ? '#22c55e' : '#ef4444',
                    marginTop: 4,
                  }}
                >
                  Netto: €{s.profit.toFixed(2)}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
