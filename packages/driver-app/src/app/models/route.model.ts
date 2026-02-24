export interface DriverRoute {
  id: string;
  vehicleLicensePlate: string;
  scheduledDate: string;
  status: string;
  stops: RouteStop[];
  packages: RoutePackage[];
}

export interface RouteStop {
  id: string;
  depotName: string;
  depotAddress: string;
  stopOrder: number;
  arrivedAt: string | null;
  departedAt: string | null;
}

export interface RoutePackage {
  id: string;
  trackingNumber: string;
  status: string;
  originAddress: string;
  destinationAddress: string;
  weightKg: number;
  pickupStopId: string;
  dropoffStopId: string;
}
