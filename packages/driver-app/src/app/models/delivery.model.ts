export interface DeliveryConfirmation {
  recipientName: string;
  notes?: string;
}

export interface DeliveryRecord {
  id: string;
  packageId: string;
  trackingNumber: string;
  destinationAddress: string;
  recipientName: string;
  deliveredAt: string;
  notes: string | null;
}
