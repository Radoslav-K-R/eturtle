import { DepotType } from '../config/constants.js';

export interface Depot {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: DepotType;
  city: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepotWithVehicleCount extends Depot {
  vehicleCount: number;
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

export interface UpdateDepotRequest {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
  type?: DepotType;
  city?: string;
}
