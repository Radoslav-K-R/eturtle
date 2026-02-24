export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: string;
  vehicleId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  fullName: string;
  role: string;
  vehicleId: string | null;
  vehicleLicensePlate: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: string;
  vehicleId?: string;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  fullName?: string;
  role?: string;
  vehicleId?: string | null;
  isActive?: boolean;
}
