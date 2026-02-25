export type DepotType = 'depot' | 'hub';

export interface Depot {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: DepotType;
  city: string | null;
  isActive: boolean;
  vehicleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DepotWithDistance extends Depot {
  distanceKm: number;
}

export interface CreateDepotRequest {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type?: DepotType;
  city?: string;
}

export interface CitySearchResult {
  displayName: string;
  city: string;
  state?: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

export interface GeocodingResult {
  displayName: string;
  latitude: number;
  longitude: number;
}
