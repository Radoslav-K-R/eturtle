export interface Package {
  id: string;
  trackingNumber: string;
  originAddress: string;
  originDepotId: string | null;
  destinationAddress: string;
  destinationDepotId: string | null;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumeCbm: number;
  contentsDescription: string | null;
  currentStatus: string;
  assignedVehicleId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PackageWithDetails extends Package {
  originDepotName: string | null;
  destinationDepotName: string | null;
  assignedVehicleLicensePlate: string | null;
}

export interface PackageWithHistory extends PackageWithDetails {
  statusHistory: PackageStatusHistoryEntry[];
}

export interface PackageStatusHistoryEntry {
  id: string;
  status: string;
  changedByUserId: string | null;
  changedByUserName: string | null;
  note: string | null;
  createdAt: Date;
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

export interface UpdatePackageRequest {
  originAddress?: string;
  destinationAddress?: string;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  contentsDescription?: string;
}
