import { DepotRepository } from '../repositories/depot.repository.js';
import { VehicleRepository } from '../repositories/vehicle.repository.js';
import { PackageRepository } from '../repositories/package.repository.js';
import { RouteRepository } from '../repositories/route.repository.js';
import { Depot } from '../models/depot.model.js';
import { Vehicle } from '../models/vehicle.model.js';
import { Package } from '../models/package.model.js';
import { PACKAGE_STATUSES } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import { RouteGenerationService } from './route-generation.service.js';

const EARTH_RADIUS_KM = 6371;
const DEGREES_TO_RADIANS = Math.PI / 180;
const CAPACITY_WEIGHT = 0.4;
const DIRECTION_WEIGHT = 0.6;
const INTER_DEPOT_DETOUR_FACTOR = 1.5;

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

function computeBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const lat1Rad = lat1 * DEGREES_TO_RADIANS;
  const lat2Rad = lat2 * DEGREES_TO_RADIANS;
  const deltaLng = (lng2 - lng1) * DEGREES_TO_RADIANS;
  const y = Math.sin(deltaLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLng);
  return Math.atan2(y, x);
}

function bearingSimilarity(bearing1: number, bearing2: number): number {
  let diff = Math.abs(bearing1 - bearing2);
  if (diff > Math.PI) {
    diff = 2 * Math.PI - diff;
  }
  return 1 - diff / Math.PI;
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
  private readonly routeRepository: RouteRepository;
  private readonly routeGenerationService: RouteGenerationService;

  constructor() {
    this.depotRepository = new DepotRepository();
    this.vehicleRepository = new VehicleRepository();
    this.packageRepository = new PackageRepository();
    this.routeRepository = new RouteRepository();
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

    const originDepot = this.resolveOriginDepot(pkg, allDepots);
    const destinationDepot = this.resolveDestinationDepot(pkg, allDepots, originDepot);

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
      logger.info('No depot resolved for package origin, leaving unassigned', { packageId });
      return null;
    }

    let availableVehicles = await this.vehicleRepository.findAvailableAtDepot(
      originDepot.id,
    );

    let bestVehicle: Vehicle | null = null;

    if (availableVehicles.length > 0) {
      bestVehicle = await this.findBestFitVehicle(
        availableVehicles,
        pkg,
        originDepot,
        destinationDepot,
      );
    }

    if (!bestVehicle) {
      bestVehicle = await this.tryInterDepotAssignment(
        pkg,
        originDepot,
        allDepots,
      );
    }

    if (!bestVehicle) {
      logger.info('No vehicle with sufficient capacity at any depot', { packageId });
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

  private resolveOriginDepot(
    pkg: Package,
    depots: Depot[],
  ): Depot | null {
    if (
      pkg.originLatitude != null &&
      pkg.originLongitude != null
    ) {
      return findNearestDepot(
        Number(pkg.originLatitude),
        Number(pkg.originLongitude),
        depots,
      );
    }
    return this.resolveDepotWithCapacitySync(depots);
  }

  private resolveDestinationDepot(
    pkg: Package,
    depots: Depot[],
    originDepot: Depot | null,
  ): Depot | null {
    if (
      pkg.destinationLatitude != null &&
      pkg.destinationLongitude != null
    ) {
      return findNearestDepot(
        Number(pkg.destinationLatitude),
        Number(pkg.destinationLongitude),
        depots,
      );
    }

    const remainingDepots = originDepot
      ? depots.filter((d) => d.id !== originDepot.id)
      : depots;
    if (remainingDepots.length > 0) {
      return remainingDepots[Math.floor(Math.random() * remainingDepots.length)]!;
    }
    return originDepot;
  }

  private resolveDepotWithCapacitySync(depots: Depot[]): Depot | null {
    return depots.length > 0 ? depots[0]! : null;
  }

  private async findBestFitVehicle(
    vehicles: Vehicle[],
    pkg: Package,
    originDepot: Depot,
    destinationDepot: Depot | null,
  ): Promise<Vehicle | null> {
    let bestVehicle: Vehicle | null = null;
    let bestScore = -Infinity;

    const packageWeight = Number(pkg.weightKg);
    const packageVolume = Number(pkg.volumeCbm);

    let packageBearing: number | null = null;
    if (
      destinationDepot &&
      originDepot.id !== destinationDepot.id
    ) {
      packageBearing = computeBearing(
        Number(originDepot.latitude),
        Number(originDepot.longitude),
        Number(destinationDepot.latitude),
        Number(destinationDepot.longitude),
      );
    }

    for (const vehicle of vehicles) {
      const load = await this.packageRepository.getVehicleLoad(vehicle.id);

      const remainingWeight = Number(vehicle.weightCapacityKg) - load.totalWeightKg;
      const remainingVolume = Number(vehicle.volumeCapacityCbm) - load.totalVolumeCbm;

      if (packageWeight > remainingWeight || packageVolume > remainingVolume) {
        continue;
      }

      const capacityScore =
        1 -
        ((remainingWeight - packageWeight) / Number(vehicle.weightCapacityKg) +
          (remainingVolume - packageVolume) / Number(vehicle.volumeCapacityCbm)) /
          2;

      let directionScore = 0.5;
      if (packageBearing != null) {
        directionScore = await this.computeDirectionScore(
          vehicle.id,
          originDepot,
          packageBearing,
        );
      }

      const score =
        CAPACITY_WEIGHT * capacityScore + DIRECTION_WEIGHT * directionScore;

      if (score > bestScore) {
        bestScore = score;
        bestVehicle = vehicle;
      }
    }

    return bestVehicle;
  }

  private async computeDirectionScore(
    vehicleId: string,
    originDepot: Depot,
    packageBearing: number,
  ): Promise<number> {
    const today = new Date().toISOString().split('T')[0]!;
    const existingRoute = await this.routeRepository.findByVehicleAndDate(
      vehicleId,
      today,
    );

    if (!existingRoute) {
      return 0.5;
    }

    const stops = await this.routeRepository.findStopsByRouteId(existingRoute.id);
    if (stops.length < 2) {
      return 0.5;
    }

    const allDepots = await this.depotRepository.findAllActive();
    const depotMap = new Map(allDepots.map((d) => [d.id, d]));

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < stops.length - 1; i++) {
      const fromDepot = depotMap.get(stops[i]!.depotId);
      const toDepot = depotMap.get(stops[i + 1]!.depotId);
      if (fromDepot && toDepot) {
        const existingBearing = computeBearing(
          Number(fromDepot.latitude),
          Number(fromDepot.longitude),
          Number(toDepot.latitude),
          Number(toDepot.longitude),
        );
        totalSimilarity += bearingSimilarity(packageBearing, existingBearing);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0.5;
  }

  private async tryInterDepotAssignment(
    pkg: Package,
    originDepot: Depot,
    allDepots: Depot[],
  ): Promise<Vehicle | null> {
    const nearbyDepots = allDepots
      .filter((d) => d.id !== originDepot.id)
      .map((d) => ({
        depot: d,
        distance: haversineDistance(
          Number(originDepot.latitude),
          Number(originDepot.longitude),
          Number(d.latitude),
          Number(d.longitude),
        ),
      }))
      .sort((a, b) => a.distance - b.distance);

    const today = new Date().toISOString().split('T')[0]!;

    for (const { depot: nearbyDepot, distance: detourDistance } of nearbyDepots) {
      const vehicles = await this.vehicleRepository.findAvailableAtDepot(
        nearbyDepot.id,
      );

      for (const vehicle of vehicles) {
        const load = await this.packageRepository.getVehicleLoad(vehicle.id);
        const remainingWeight =
          Number(vehicle.weightCapacityKg) - load.totalWeightKg;
        const remainingVolume =
          Number(vehicle.volumeCapacityCbm) - load.totalVolumeCbm;

        if (
          Number(pkg.weightKg) > remainingWeight ||
          Number(pkg.volumeCbm) > remainingVolume
        ) {
          continue;
        }

        const existingRoute = await this.routeRepository.findByVehicleAndDate(
          vehicle.id,
          today,
        );
        if (!existingRoute) {
          continue;
        }

        const stops = await this.routeRepository.findStopsByRouteId(
          existingRoute.id,
        );
        if (stops.length === 0) {
          continue;
        }

        let routeLength = 0;
        const allDepotsMap = new Map(allDepots.map((d) => [d.id, d]));
        for (let i = 0; i < stops.length - 1; i++) {
          const fromDepot = allDepotsMap.get(stops[i]!.depotId);
          const toDepot = allDepotsMap.get(stops[i + 1]!.depotId);
          if (fromDepot && toDepot) {
            routeLength += haversineDistance(
              Number(fromDepot.latitude),
              Number(fromDepot.longitude),
              Number(toDepot.latitude),
              Number(toDepot.longitude),
            );
          }
        }

        if (detourDistance <= routeLength * INTER_DEPOT_DETOUR_FACTOR || routeLength === 0) {
          logger.info('Inter-depot assignment: using vehicle from nearby depot', {
            packageId: pkg.id,
            vehicleId: vehicle.id,
            nearbyDepotId: nearbyDepot.id,
            detourDistance,
          });
          return vehicle;
        }
      }
    }

    return null;
  }
}
