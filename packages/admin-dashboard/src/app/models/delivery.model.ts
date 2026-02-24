export interface Delivery {
  id: string;
  packageId: string;
  trackingNumber: string;
  destinationAddress: string;
  routeId: string;
  driverId: string;
  driverName: string;
  deliveredAt: string;
  note: string | null;
  createdAt: string;
}
