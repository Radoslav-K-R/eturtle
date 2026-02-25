export interface Route {
  id: string;
  vehicleId: string;
  driverId: string;
  routeDate: string;
  status: string;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RouteListItem extends Route {
  vehicleLicensePlate: string;
  driverName: string;
  stopCount: number;
  packageCount: number;
  approvedByUserName: string | null;
}

export interface RouteWithDetails extends RouteListItem {
  vehicleType: string;
  stops: RouteStopWithPackages[];
}

export interface RouteStop {
  id: string;
  routeId: string;
  depotId: string;
  stopOrder: number;
  estimatedArrival: Date | null;
  actualArrival: Date | null;
  createdAt: Date;
}

export interface RouteStopWithPackages extends RouteStop {
  depotName: string;
  depotLatitude: number | null;
  depotLongitude: number | null;
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

export interface RoutePackage {
  id: string;
  routeId: string;
  packageId: string;
  pickupStopId: string;
  dropoffStopId: string;
  createdAt: Date;
}

export interface CreateRouteRequest {
  vehicleId: string;
  driverId: string;
  routeDate: string;
  stops: { depotId: string; stopOrder: number }[];
}

export interface RejectRouteRequest {
  reason?: string;
}
