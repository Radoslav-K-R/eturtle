import { DepotRepository } from '../repositories/depot.repository.js';
import { VehicleRepository } from '../repositories/vehicle.repository.js';
import { PackageRepository } from '../repositories/package.repository.js';
import { Depot } from '../models/depot.model.js';
import { Vehicle } from '../models/vehicle.model.js';
import { Package } from '../models/package.model.js';
import { PACKAGE_STATUSES } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import { RouteGenerationService } from './route-generation.service.js';

const EARTH_RADIUS_KM = 6371;
const DEGREES_TO_RADIANS = Math.PI / 180;

function haversineDistance(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const deltaLatitude = (latitude2 - latitude1) * DEGREES_TO_RADIANS;
  const deltaLongitude = (longitude2 - longitude1) * DEGREES_TO_RADIANS;
  const halfChordSquared =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(latitude1 * DEGREES_TO_RADIANS) *
    Math.cos(latitude2 * DEGREES_TO_RADIANS) *
    Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2);
  const angularDistance = 2 * Math.atan2(
    Math.sqrt(halfChordSquared),
    Math.sqrt(1 - halfChordSquared),
  );
  return EARTH_RADIUS_KM * angularDistance;
}

function findNearestDepot(
  latitude: number,
  longitude: number,
  depots: Depot[],
): Depot | null {
  let nearestDepot: Depot | null = null;
  let minimumDistance = Infinity;

  for (const depot of depots) {
    const distance = haversineDistance(
      latitude,
      longitude,
      Number(depot.latitude),
      Number(depot.longitude),
    );
    if (distance < minimumDistance) {
      minimumDistance = distance;
      nearestDepot = depot;
    }
  }

  return nearestDepot;
}

export class PackageAssignmentService {
  private readonly depotRepository: DepotRepository;
  private readonly vehicleRepository: VehicleRepository;
  private readonly packageRepository: PackageRepository;
  private readonly routeGenerationService: RouteGenerationService;

  constructor() {
    this.depotRepository = new DepotRepository();
    this.vehicleRepository = new VehicleRepository();
    this.packageRepository = new PackageRepository();
    this.routeGenerationService = new RouteGenerationService();
  }

  async assignPackage(packageId: string): Promise<Vehicle | null> {
    const pkg = await this.packageRepository.getRawById(packageId);
    if (!pkg) {
      logger.warn('Package not found for assignment', { packageId });
      return null;
    }

    const allDepots = await this.depotRepository.findAllActive();
    if (allDepots.length === 0) {
      logger.warn('No active depots available for assignment');
      return null;
    }

    const originDepot = this.resolveNearestDepot(allDepots);
    const destinationDepot = this.resolveNearestDepot(allDepots);

    if (originDepot) {
      await this.packageRepository.updateFields(packageId, {
        originDepotId: originDepot.id,
      });
    }
    if (destinationDepot) {
      await this.packageRepository.updateFields(packageId, {
        destinationDepotId: destinationDepot.id,
      });
    }

    if (!originDepot) {
      logger.info('No depot near package origin, leaving unassigned', { packageId });
      return null;
    }

    const availableVehicles = await this.vehicleRepository.findAvailableAtDepot(
      originDepot.id,
    );

    if (availableVehicles.length === 0) {
      logger.info('No available vehicles at origin depot', {
        packageId,
        depotId: originDepot.id,
      });
      return null;
    }

    const bestVehicle = await this.findBestFitVehicle(availableVehicles, pkg);

    if (!bestVehicle) {
      logger.info('No vehicle with sufficient capacity', { packageId });
      return null;
    }

    await this.packageRepository.updateFields(packageId, {
      assignedVehicleId: bestVehicle.id,
    });
    await this.packageRepository.updateStatus(
      packageId,
      PACKAGE_STATUSES.ASSIGNED,
      null,
      `Auto-assigned to vehicle ${bestVehicle.licensePlate}`,
    );

    logger.info('Package auto-assigned', {
      packageId,
      vehicleId: bestVehicle.id,
      licensePlate: bestVehicle.licensePlate,
    });

    if (originDepot && destinationDepot) {
      await this.routeGenerationService.generateRoute(
        bestVehicle,
        packageId,
        originDepot.id,
        destinationDepot.id,
      );
    }

    return bestVehicle;
  }

  private resolveNearestDepot(depots: Depot[]): Depot | null {
    if (depots.length === 0) {
      return null;
    }
    return depots[0] ?? null;
  }

  private async findBestFitVehicle(
    vehicles: Vehicle[],
    pkg: Package,
  ): Promise<Vehicle | null> {
    let bestVehicle: Vehicle | null = null;
    let bestScore = Infinity;

    const packageWeight = Number(pkg.weightKg);
    const packageVolume = Number(pkg.volumeCbm);

    for (const vehicle of vehicles) {
      const load = await this.packageRepository.getVehicleLoad(vehicle.id);

      const remainingWeight = Number(vehicle.weightCapacityKg) - load.totalWeightKg;
      const remainingVolume = Number(vehicle.volumeCapacityCbm) - load.totalVolumeCbm;

      if (packageWeight > remainingWeight || packageVolume > remainingVolume) {
        continue;
      }

      const weightScore = (remainingWeight - packageWeight)
        / Number(vehicle.weightCapacityKg);
      const volumeScore = (remainingVolume - packageVolume)
        / Number(vehicle.volumeCapacityCbm);
      const score = weightScore + volumeScore;

      if (score < bestScore) {
        bestScore = score;
        bestVehicle = vehicle;
      }
    }

    return bestVehicle;
  }
}
