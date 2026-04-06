export interface FuelStation {
  id: string;
  name: string;
  brand: string;
  street: string;
  place: string;
  lat: number;
  lng: number;
  e5?: number;
  e10?: number;
  diesel?: number;
  dist?: number;
  isOpen?: boolean;
  country: 'DE' | 'BE' | 'NL';
}

export interface VehicleData {
  kenteken: string;
  merk: string;
  model: string;
  brandstof: string;
  verbruik: number; // 1 op X km
  tankinhoud: number; // liters
}

export interface TripCalculation {
  station: FuelStation;
  distanceKm: number;
  fuelPrice: number;
  nlPrice: number;
  savingPerLiter: number;
  totalSaving: number;
  tripFuelCost: number;
  netProfit: number;
}

export function calculateNetProfit(
  nlPrice: number,
  foreignPrice: number,
  tankSize: number,
  distanceKm: number,
  consumption: number // 1 op X
): number {
  const fuelForTrip = (distanceKm * 2) / consumption;
  const tripCost = fuelForTrip * foreignPrice;
  const grossSaving = (nlPrice - foreignPrice) * tankSize;
  return grossSaving - tripCost;
}

export function calculateBreakeven(
  priceDiffPerLiter: number,
  tankSize: number,
  fuelPrice: number,
  consumption: number
): number {
  // Max km you can drive one-way before savings = 0
  // netProfit = priceDiff * tankSize - (2*dist/consumption) * fuelPrice = 0
  // dist = (priceDiff * tankSize * consumption) / (2 * fuelPrice)
  if (fuelPrice <= 0 || consumption <= 0) return 0;
  return (priceDiffPerLiter * tankSize * consumption) / (2 * fuelPrice);
}

export function calculateTripDetails(
  station: FuelStation,
  fuelType: 'e5' | 'e10' | 'diesel',
  nlPrice: number,
  distanceKm: number,
  consumption: number,
  tankSize: number
): TripCalculation | null {
  const fuelPrice = station[fuelType];
  if (!fuelPrice) return null;

  const savingPerLiter = nlPrice - fuelPrice;
  const totalSaving = savingPerLiter * tankSize;
  const fuelForTrip = (distanceKm * 2) / consumption;
  const tripFuelCost = fuelForTrip * fuelPrice;
  const netProfit = totalSaving - tripFuelCost;

  return {
    station,
    distanceKm,
    fuelPrice,
    nlPrice,
    savingPerLiter,
    totalSaving,
    tripFuelCost,
    netProfit,
  };
}
