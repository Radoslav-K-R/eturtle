export interface Delivery {
  id: string;
  packageId: string;
  routeId: string;
  driverId: string;
  deliveredAt: Date;
  note: string | null;
  createdAt: Date;
}

export interface DeliveryWithDetails extends Delivery {
  trackingNumber: string;
  destinationAddress: string;
  driverName: string;
}

export interface CreateDeliveryRequest {
  packageId: string;
  note?: string;
}
