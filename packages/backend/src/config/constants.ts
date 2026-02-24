export const USER_ROLES = {
  ADMIN: 'admin',
  DRIVER: 'driver',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const VEHICLE_TYPES = {
  VAN: 'van',
  TRUCK: 'truck',
  MOTORCYCLE: 'motorcycle',
} as const;

export type VehicleType = typeof VEHICLE_TYPES[keyof typeof VEHICLE_TYPES];

export const VEHICLE_STATUSES = {
  AVAILABLE: 'available',
  IN_TRANSIT: 'in_transit',
  MAINTENANCE: 'maintenance',
} as const;

export type VehicleStatus = typeof VEHICLE_STATUSES[keyof typeof VEHICLE_STATUSES];

export const PACKAGE_STATUSES = {
  REGISTERED: 'registered',
  ASSIGNED: 'assigned',
  IN_TRANSIT: 'in_transit',
  AT_DEPOT: 'at_depot',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
} as const;

export type PackageStatus = typeof PACKAGE_STATUSES[keyof typeof PACKAGE_STATUSES];

export const TERMINAL_PACKAGE_STATUSES: ReadonlySet<string> = new Set([
  PACKAGE_STATUSES.DELIVERED,
  PACKAGE_STATUSES.RETURNED,
  PACKAGE_STATUSES.CANCELLED,
]);

export const VALID_PACKAGE_TRANSITIONS: Record<string, readonly string[]> = {
  [PACKAGE_STATUSES.REGISTERED]: [
    PACKAGE_STATUSES.ASSIGNED,
    PACKAGE_STATUSES.CANCELLED,
  ],
  [PACKAGE_STATUSES.ASSIGNED]: [
    PACKAGE_STATUSES.IN_TRANSIT,
    PACKAGE_STATUSES.REGISTERED,
    PACKAGE_STATUSES.CANCELLED,
  ],
  [PACKAGE_STATUSES.IN_TRANSIT]: [
    PACKAGE_STATUSES.AT_DEPOT,
    PACKAGE_STATUSES.OUT_FOR_DELIVERY,
    PACKAGE_STATUSES.CANCELLED,
  ],
  [PACKAGE_STATUSES.AT_DEPOT]: [
    PACKAGE_STATUSES.IN_TRANSIT,
    PACKAGE_STATUSES.CANCELLED,
  ],
  [PACKAGE_STATUSES.OUT_FOR_DELIVERY]: [
    PACKAGE_STATUSES.DELIVERED,
    PACKAGE_STATUSES.RETURNED,
    PACKAGE_STATUSES.CANCELLED,
  ],
};

export const ROUTE_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export type RouteStatus = typeof ROUTE_STATUSES[keyof typeof ROUTE_STATUSES];

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const TRACKING_NUMBER_PREFIX = 'ET';

export const VOLUME_DIVISOR = 1_000_000;
