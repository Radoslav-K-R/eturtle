export interface Vehicle {
  id: string;
  licensePlate: string;
  type: string;
  weightCapacityKg: number;
  volumeCapacityCbm: number;
  currentDepotId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleWithDetails extends Vehicle {
  currentDepotName: string | null;
  assignedDriver: { id: string; fullName: string } | null;
  currentLoadKg: number;
  currentLoadCbm: number;
}

export interface CreateVehicleRequest {
  licensePlate: string;
  type: string;
  weightCapacityKg: number;
  volumeCapacityCbm: number;
  currentDepotId?: string;
}

export interface UpdateVehicleRequest {
  licensePlate?: string;
  type?: string;
  weightCapacityKg?: number;
  volumeCapacityCbm?: number;
  currentDepotId?: string | null;
  status?: string;
}
