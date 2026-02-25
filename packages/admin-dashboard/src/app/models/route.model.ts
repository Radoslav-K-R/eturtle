export interface Route {
  id: string;
  vehicleId: string;
  vehicleLicensePlate: string;
  driverId: string;
  driverName: string;
  routeDate: string;
  status: string;
  stopCount: number;
  packageCount: number;
  approvedByUserName: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RouteWithDetails extends Route {
  vehicleType: string;
  stops: RouteStop[];
}

export interface RouteStop {
  id: string;
  depotId: string;
  depotName: string;
  depotLatitude: number | null;
  depotLongitude: number | null;
  stopOrder: number;
  pickupPackages: RoutePackageSummary[];
  dropoffPackages: RoutePackageSummary[];
}

export interface RoutePackageSummary {
  id: string;
  trackingNumber: string;
  destinationAddress: string;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
}
