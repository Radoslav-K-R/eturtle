export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  vehicleId: string | null;
  vehicleLicensePlate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: string;
  vehicleId?: string;
}
