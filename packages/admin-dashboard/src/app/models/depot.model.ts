export interface Depot {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  vehicleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepotRequest {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}
