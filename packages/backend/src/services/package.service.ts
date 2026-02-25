import { PackageRepository } from '../repositories/package.repository.js';
import { PackageWithDetails, PackageWithHistory, CreatePackageRequest, UpdatePackageRequest } from '../models/package.model.js';
import { PackageAssignmentService } from './package-assignment.service.js';
import { AppError } from '../middleware/error-handler.js';
import { PAGINATION_DEFAULTS, TRACKING_NUMBER_PREFIX } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const HTTP_NOT_FOUND = 404;
const TRACKING_ID_LENGTH = 6;

function generateTrackingNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const randomPart = uuidv4().replace(/-/g, '').substring(0, TRACKING_ID_LENGTH).toUpperCase();
  return `${TRACKING_NUMBER_PREFIX}-${year}${month}${day}-${randomPart}`;
}

export class PackageService {
  private readonly packageRepository: PackageRepository;
  private readonly assignmentService: PackageAssignmentService;

  constructor() {
    this.packageRepository = new PackageRepository();
    this.assignmentService = new PackageAssignmentService();
  }

  async findAll(
    page: number = PAGINATION_DEFAULTS.PAGE,
    pageSize: number = PAGINATION_DEFAULTS.PAGE_SIZE,
    sortBy: string = 'createdAt',
    sortOrder: string = 'desc',
    status?: string,
    originDepotId?: string,
    destinationDepotId?: string,
  ): Promise<{ items: PackageWithDetails[]; total: number }> {
    return this.packageRepository.findAll(
      page, pageSize, sortBy, sortOrder, status, originDepotId, destinationDepotId,
    );
  }

  async findById(id: string): Promise<PackageWithHistory> {
    const pkg = await this.packageRepository.findById(id);
    if (!pkg) {
      throw new AppError('Package not found', HTTP_NOT_FOUND);
    }
    const statusHistory = await this.packageRepository.findStatusHistory(id);
    return { ...pkg, statusHistory };
  }

  async create(
    request: CreatePackageRequest,
    createdByUserId: string | null,
  ): Promise<PackageWithDetails> {
    const trackingNumber = generateTrackingNumber();

    const pkg = await this.packageRepository.create(
      trackingNumber,
      request.originAddress,
      request.destinationAddress,
      request.weightKg,
      request.lengthCm,
      request.widthCm,
      request.heightCm,
      request.contentsDescription ?? null,
      request.originLatitude ?? null,
      request.originLongitude ?? null,
      request.destinationLatitude ?? null,
      request.destinationLongitude ?? null,
    );

    await this.packageRepository.updateStatus(
      pkg.id,
      'registered',
      createdByUserId,
      'Package registered in the system',
    );

    const assignedVehicle = await this.assignmentService.assignPackage(pkg.id);
    if (assignedVehicle) {
      logger.info('Package auto-assigned during creation', {
        packageId: pkg.id,
        vehicleId: assignedVehicle.id,
      });
    }

    const created = await this.packageRepository.findById(pkg.id);
    return created!;
  }

  async update(id: string, request: UpdatePackageRequest): Promise<PackageWithDetails> {
    const existing = await this.packageRepository.getRawById(id);
    if (!existing) {
      throw new AppError('Package not found', HTTP_NOT_FOUND);
    }

    await this.packageRepository.updateFields(id, request as Record<string, unknown>);
    const updated = await this.packageRepository.findById(id);
    return updated!;
  }
}
