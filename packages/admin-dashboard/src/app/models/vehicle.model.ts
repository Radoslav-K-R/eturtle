export interface Vehicle {
  id: string;
  licensePlate: string;
  type: string;
  weightCapacityKg: number;
  volumeCapacityCbm: number;
  currentDepotId: string | null;
  currentDepotName: string | null;
  status: string;
  assignedDriver: { id: string; fullName: string } | null;
  currentLoadKg: number;
  currentLoadCbm: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleRequest {
  licensePlate: string;
  type: string;
  weightCapacityKg: number;
  volumeCapacityCbm: number;
  currentDepotId?: string;
}
