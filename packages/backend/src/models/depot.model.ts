export interface Depot {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepotWithVehicleCount extends Depot {
  vehicleCount: number;
}

export interface CreateDepotRequest {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface UpdateDepotRequest {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}
