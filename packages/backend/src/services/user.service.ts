import { UserRepository } from '../repositories/user.repository.js';
import { UserPublic, CreateUserRequest, UpdateUserRequest } from '../models/user.model.js';
import { hashPassword } from '../utils/password.js';
import { AppError } from '../middleware/error-handler.js';
import { PAGINATION_DEFAULTS, USER_ROLES } from '../config/constants.js';

const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;

export class UserService {
  private readonly userRepository: UserRepository;
  private readonly bcryptCostFactor: number;

  constructor(bcryptCostFactor: number) {
    this.userRepository = new UserRepository();
    this.bcryptCostFactor = bcryptCostFactor;
  }

  async findAll(
    page: number = PAGINATION_DEFAULTS.PAGE,
    pageSize: number = PAGINATION_DEFAULTS.PAGE_SIZE,
    sortBy: string = 'fullName',
    sortOrder: string = 'asc',
    role?: string,
    isActive?: boolean,
  ): Promise<{ items: UserPublic[]; total: number }> {
    return this.userRepository.findAll(page, pageSize, sortBy, sortOrder, role, isActive);
  }

  async findById(id: string): Promise<UserPublic> {
    const result = await this.userRepository.findAll(1, 1, 'fullName', 'asc');
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', HTTP_NOT_FOUND);
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      vehicleId: user.vehicleId,
      vehicleLicensePlate: null,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async create(request: CreateUserRequest): Promise<UserPublic> {
    const validRoles = Object.values(USER_ROLES);
    if (!validRoles.includes(request.role as typeof validRoles[number])) {
      throw new AppError(
        `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        HTTP_BAD_REQUEST,
      );
    }

    const existingUser = await this.userRepository.findByEmail(request.email);
    if (existingUser) {
      throw new AppError('Email already in use', HTTP_CONFLICT);
    }

    if (request.vehicleId) {
      const isAssigned = await this.userRepository.isVehicleAssigned(request.vehicleId);
      if (isAssigned) {
        throw new AppError('Vehicle is already assigned to another driver', HTTP_CONFLICT);
      }
    }

    const passwordHash = await hashPassword(request.password, this.bcryptCostFactor);

    const user = await this.userRepository.create(
      request.email,
      passwordHash,
      request.fullName,
      request.role,
      request.vehicleId ?? null,
    );

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      vehicleId: user.vehicleId,
      vehicleLicensePlate: null,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async update(id: string, request: UpdateUserRequest): Promise<UserPublic> {
    const fields: Record<string, unknown> = {};

    if (request.email !== undefined) {
      fields['email'] = request.email;
    }
    if (request.fullName !== undefined) {
      fields['fullName'] = request.fullName;
    }
    if (request.role !== undefined) {
      fields['role'] = request.role;
    }
    if (request.isActive !== undefined) {
      fields['isActive'] = request.isActive;
    }
    if (request.vehicleId !== undefined) {
      if (request.vehicleId !== null) {
        const isAssigned = await this.userRepository.isVehicleAssigned(request.vehicleId, id);
        if (isAssigned) {
          throw new AppError('Vehicle is already assigned to another driver', HTTP_CONFLICT);
        }
      }
      fields['vehicleId'] = request.vehicleId;
    }
    if (request.password !== undefined) {
      fields['passwordHash'] = await hashPassword(request.password, this.bcryptCostFactor);
    }

    const user = await this.userRepository.update(id, fields);
    if (!user) {
      throw new AppError('User not found', HTTP_NOT_FOUND);
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      vehicleId: user.vehicleId,
      vehicleLicensePlate: null,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
