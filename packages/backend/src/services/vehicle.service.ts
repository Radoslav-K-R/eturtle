import { VehicleRepository } from '../repositories/vehicle.repository.js';
import { Vehicle, VehicleWithDetails, CreateVehicleRequest, UpdateVehicleRequest } from '../models/vehicle.model.js';
import { AppError } from '../middleware/error-handler.js';
import { PAGINATION_DEFAULTS, VEHICLE_TYPES } from '../config/constants.js';

const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;

export class VehicleService {
  private readonly vehicleRepository: VehicleRepository;

  constructor() {
    this.vehicleRepository = new VehicleRepository();
  }

  async findAll(
    page: number = PAGINATION_DEFAULTS.PAGE,
    pageSize: number = PAGINATION_DEFAULTS.PAGE_SIZE,
    sortBy: string = 'licensePlate',
    sortOrder: string = 'asc',
    type?: string,
    depotId?: string,
    status?: string,
  ): Promise<{ items: VehicleWithDetails[]; total: number }> {
    return this.vehicleRepository.findAll(page, pageSize, sortBy, sortOrder, type, depotId, status);
  }

  async findById(id: string): Promise<VehicleWithDetails> {
    const vehicle = await this.vehicleRepository.findById(id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', HTTP_NOT_FOUND);
    }
    return vehicle;
  }

  async create(request: CreateVehicleRequest): Promise<Vehicle> {
    const validTypes = Object.values(VEHICLE_TYPES);
    if (!validTypes.includes(request.type as typeof validTypes[number])) {
      throw new AppError(
        `Invalid vehicle type. Must be one of: ${validTypes.join(', ')}`,
        HTTP_BAD_REQUEST,
      );
    }
    return this.vehicleRepository.create(
      request.licensePlate,
      request.type,
      request.weightCapacityKg,
      request.volumeCapacityCbm,
      request.currentDepotId ?? null,
    );
  }

  async update(id: string, request: UpdateVehicleRequest): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.update(id, request as Record<string, unknown>);
    if (!vehicle) {
      throw new AppError('Vehicle not found', HTTP_NOT_FOUND);
    }
    return vehicle;
  }
}
