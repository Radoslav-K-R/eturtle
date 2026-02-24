export interface Package {
  id: string;
  trackingNumber: string;
  originAddress: string;
  originDepotId: string | null;
  originDepotName: string | null;
  destinationAddress: string;
  destinationDepotId: string | null;
  destinationDepotName: string | null;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumeCbm: number;
  contentsDescription: string | null;
  currentStatus: string;
  assignedVehicleId: string | null;
  assignedVehicleLicensePlate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PackageWithHistory extends Package {
  statusHistory: PackageStatusHistoryEntry[];
}

export interface PackageStatusHistoryEntry {
  id: string;
  status: string;
  changedByUserId: string | null;
  changedByUserName: string | null;
  note: string | null;
  createdAt: string;
}

export interface CreatePackageRequest {
  originAddress: string;
  destinationAddress: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  contentsDescription?: string;
}
