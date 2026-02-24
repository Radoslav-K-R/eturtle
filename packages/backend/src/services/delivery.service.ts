import { DeliveryRepository } from '../repositories/delivery.repository.js';
import { PackageRepository } from '../repositories/package.repository.js';
import { RouteRepository } from '../repositories/route.repository.js';
import { DeliveryWithDetails, CreateDeliveryRequest } from '../models/delivery.model.js';
import { AppError } from '../middleware/error-handler.js';
import { PAGINATION_DEFAULTS, PACKAGE_STATUSES } from '../config/constants.js';
import { getPool } from '../config/database.js';

const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const MAX_NOTE_LENGTH = 1000;

export class DeliveryService {
  private readonly deliveryRepository: DeliveryRepository;
  private readonly packageRepository: PackageRepository;
  private readonly routeRepository: RouteRepository;

  constructor() {
    this.deliveryRepository = new DeliveryRepository();
    this.packageRepository = new PackageRepository();
    this.routeRepository = new RouteRepository();
  }

  async findAll(
    page: number = PAGINATION_DEFAULTS.PAGE,
    pageSize: number = PAGINATION_DEFAULTS.PAGE_SIZE,
    sortBy: string = 'deliveredAt',
    sortOrder: string = 'desc',
    driverId?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{ items: DeliveryWithDetails[]; total: number }> {
    return this.deliveryRepository.findAll(
      page, pageSize, sortBy, sortOrder, driverId, dateFrom, dateTo,
    );
  }

  async findById(id: string): Promise<DeliveryWithDetails> {
    const delivery = await this.deliveryRepository.findById(id);
    if (!delivery) {
      throw new AppError('Delivery not found', HTTP_NOT_FOUND);
    }
    return delivery;
  }

  async create(
    request: CreateDeliveryRequest,
    driverId: string,
  ): Promise<DeliveryWithDetails> {
    const pkg = await this.packageRepository.getRawById(request.packageId);
    if (!pkg) {
      throw new AppError('Package not found', HTTP_NOT_FOUND);
    }

    if (pkg.currentStatus !== PACKAGE_STATUSES.OUT_FOR_DELIVERY
        && pkg.currentStatus !== PACKAGE_STATUSES.IN_TRANSIT) {
      throw new AppError(
        'Package must be in transit or out for delivery to be marked as delivered',
        HTTP_BAD_REQUEST,
      );
    }

    if (request.note && request.note.length > MAX_NOTE_LENGTH) {
      throw new AppError(
        `Note must be at most ${MAX_NOTE_LENGTH} characters`,
        HTTP_BAD_REQUEST,
      );
    }

    const pool = getPool();
    const driverResult = await pool.query<{ vehicleId: string | null }>(
      'SELECT vehicle_id AS "vehicleId" FROM users WHERE id = $1',
      [driverId],
    );
    const driverVehicleId = driverResult.rows[0]?.vehicleId;

    if (!driverVehicleId || driverVehicleId !== pkg.assignedVehicleId) {
      throw new AppError(
        'You can only deliver packages assigned to your vehicle',
        HTTP_FORBIDDEN,
      );
    }

    const todayRoute = await this.routeRepository.findTodayRouteForDriver(driverId);
    const routeId = todayRoute?.id;

    if (!routeId) {
      throw new AppError('No active route found for today', HTTP_BAD_REQUEST);
    }

    const delivery = await this.deliveryRepository.create(
      request.packageId,
      routeId,
      driverId,
      request.note ?? null,
    );

    await this.packageRepository.updateStatus(
      request.packageId,
      PACKAGE_STATUSES.DELIVERED,
      driverId,
      request.note ?? 'Package delivered',
    );

    const result = await this.deliveryRepository.findById(delivery.id);
    return result!;
  }
}
