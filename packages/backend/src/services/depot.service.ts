import { DepotRepository } from '../repositories/depot.repository.js';
import { Depot, DepotWithVehicleCount, DepotWithDistance, CreateDepotRequest, UpdateDepotRequest } from '../models/depot.model.js';
import { AppError } from '../middleware/error-handler.js';
import { PAGINATION_DEFAULTS } from '../config/constants.js';
import { DepotType } from '../config/constants.js';

const HTTP_NOT_FOUND = 404;

export class DepotService {
  private readonly depotRepository: DepotRepository;

  constructor() {
    this.depotRepository = new DepotRepository();
  }

  async findAll(
    page: number = PAGINATION_DEFAULTS.PAGE,
    pageSize: number = PAGINATION_DEFAULTS.PAGE_SIZE,
    sortBy: string = 'name',
    sortOrder: string = 'asc',
    isActive?: boolean,
    type?: DepotType,
  ): Promise<{ items: DepotWithVehicleCount[]; total: number }> {
    return this.depotRepository.findAll(page, pageSize, sortBy, sortOrder, isActive, type);
  }

  async findById(id: string): Promise<DepotWithVehicleCount> {
    const depot = await this.depotRepository.findById(id);
    if (!depot) {
      throw new AppError('Depot not found', HTTP_NOT_FOUND);
    }
    return depot;
  }

  async create(request: CreateDepotRequest): Promise<Depot> {
    return this.depotRepository.create(
      request.name,
      request.address,
      request.latitude,
      request.longitude,
      request.type ?? 'depot',
      request.city,
    );
  }

  async update(id: string, request: UpdateDepotRequest): Promise<Depot> {
    const depot = await this.depotRepository.update(id, request as Record<string, unknown>);
    if (!depot) {
      throw new AppError('Depot not found', HTTP_NOT_FOUND);
    }
    return depot;
  }

  async findNearest(
    latitude: number,
    longitude: number,
    type?: DepotType,
    limit: number = 5,
  ): Promise<DepotWithDistance[]> {
    return this.depotRepository.findNearest(latitude, longitude, type, limit);
  }
}
