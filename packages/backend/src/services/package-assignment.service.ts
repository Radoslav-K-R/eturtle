import { DepotRepository } from '../repositories/depot.repository.js';
import { VehicleRepository } from '../repositories/vehicle.repository.js';
import { PackageRepository } from '../repositories/package.repository.js';
import { RouteRepository } from '../repositories/route.repository.js';
import { Depot } from '../models/depot.model.js';
import { Vehicle } from '../models/vehicle.model.js';
import { Package } from '../models/package.model.js';
import { Route } from '../models/route.model.js';
import { PACKAGE_STATUSES } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import { RouteGenerationService } from './route-generation.service.js';

const EARTH_RADIUS_KM = 6371;
const DEGREES_TO_RADIANS = Math.PI / 180;
const LONG_ROUTE_THRESHOLD_KM = 50;
const MAX_DETOUR_RATIO = 0.5;
const EXISTING_ROUTE_BONUS = 1.3;

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = (lat2 - lat1) * DEGREES_TO_RADIANS;
  const dLng = (lng2 - lng1) * DEGREES_TO_RADIANS;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEGREES_TO_RADIANS) *
    Math.cos(lat2 * DEGREES_TO_RADIANS) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestDepot(
  latitude: number,
  longitude: number,
  depots: Depot[],
): Depot | null {
  let nearest: Depot | null = null;
  let minDist = Infinity;
  for (const depot of depots) {
    const dist = haversineDistance(
      latitude,
      longitude,
      Number(depot.latitude),
      Number(depot.longitude),
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = depot;
    }
  }
  return nearest;
}

function computeRouteDistance(depots: Depot[]): number {
  let total = 0;
  for (let i = 0; i < depots.length - 1; i++) {
    total += haversineDistance(
      Number(depots[i]!.latitude),
      Number(depots[i]!.longitude),
      Number(depots[i + 1]!.latitude),
      Number(depots[i + 1]!.longitude),
    );
  }
  return total;
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

    const depotMap = new Map(allDepots.map((d) => [d.id, d]));

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

    const packageDist = destinationDepot
      ? haversineDistance(
          Number(originDepot.latitude),
          Number(originDepot.longitude),
          Number(destinationDepot.latitude),
          Number(destinationDepot.longitude),
        )
      : 0;

    // Phase 1: Try consolidating into an existing pending route
    const consolidatedVehicle = await this.tryConsolidateIntoExistingRoute(
      pkg,
      originDepot,
      destinationDepot,
      depotMap,
    );
    if (consolidatedVehicle) {
      await this.packageRepository.updateFields(packageId, {
        assignedVehicleId: consolidatedVehicle.id,
      });
      await this.packageRepository.updateStatus(
        packageId,
        PACKAGE_STATUSES.ASSIGNED,
        null,
        `Consolidated into existing route on vehicle ${consolidatedVehicle.licensePlate}`,
      );
      logger.info('Package consolidated into existing route', {
        packageId,
        vehicleId: consolidatedVehicle.id,
      });
      return consolidatedVehicle;
    }

    // Phase 2: Find best vehicle globally for a new trunk route
    const bestVehicle = await this.findBestVehicleGlobally(
      pkg,
      originDepot,
      destinationDepot,
      packageDist,
      depotMap,
    );

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

  /**
   * Phase 1: Try to add the package to an existing pending route.
   * Evaluates detour cost for each route and picks the most efficient.
   */
  private async tryConsolidateIntoExistingRoute(
    pkg: Package,
    originDepot: Depot,
    destinationDepot: Depot | null,
    depotMap: Map<string, Depot>,
  ): Promise<Vehicle | null> {
    if (!destinationDepot) return null;

    const today = new Date().toISOString().split('T')[0]!;
    const pendingRoutes = await this.routeRepository.findAllPendingForDate(today);
    if (pendingRoutes.length === 0) return null;

    let bestRoute: Route | null = null;
    let bestScore = -Infinity;
    let bestVehicle: Vehicle | null = null;

    for (const route of pendingRoutes) {
      const vehicle = await this.vehicleRepository.findRawById(route.vehicleId);
      if (!vehicle) continue;

      // Check capacity
      const load = await this.packageRepository.getVehicleLoad(route.vehicleId);
      const remainingWeight = Number(vehicle.weightCapacityKg) - load.totalWeightKg;
      const remainingVolume = Number(vehicle.volumeCapacityCbm) - load.totalVolumeCbm;
      if (Number(pkg.weightKg) > remainingWeight || Number(pkg.volumeCbm) > remainingVolume) {
        continue;
      }

      // Get route stop depots
      const stops = await this.routeRepository.findStopsByRouteId(route.id);
      const stopDepots = stops
        .map((s) => depotMap.get(s.depotId))
        .filter((d): d is Depot => d != null);
      if (stopDepots.length < 1) continue;

      const hasOrigin = stops.some((s) => s.depotId === originDepot.id);
      const hasDest = stops.some((s) => s.depotId === destinationDepot.id);

      // Both stops already in route — almost free to add
      if (hasOrigin && hasDest) {
        const score = EXISTING_ROUTE_BONUS * 2;
        if (score > bestScore) {
          bestScore = score;
          bestRoute = route;
          bestVehicle = vehicle;
        }
        continue;
      }

      // Compute detour cost from inserting new depot stops
      const currentDist = computeRouteDistance(stopDepots);
      const newStopDepots = [...stopDepots];
      const depotsToInsert: Depot[] = [];
      if (!hasOrigin) depotsToInsert.push(originDepot);
      if (!hasDest) depotsToInsert.push(destinationDepot);

      for (const depot of depotsToInsert) {
        let bestPos = newStopDepots.length;
        let bestPosDist = Infinity;
        for (let i = 0; i <= newStopDepots.length; i++) {
          const trial = [...newStopDepots];
          trial.splice(i, 0, depot);
          const trialDist = computeRouteDistance(trial);
          if (trialDist < bestPosDist) {
            bestPosDist = trialDist;
            bestPos = i;
          }
        }
        newStopDepots.splice(bestPos, 0, depot);
      }

      const newDist = computeRouteDistance(newStopDepots);
      const detourDist = newDist - currentDist;
      const detourRatio = currentDist > 0 ? detourDist / currentDist : detourDist;

      if (detourRatio > MAX_DETOUR_RATIO) continue;

      const score = EXISTING_ROUTE_BONUS / (1 + detourRatio);
      if (score > bestScore) {
        bestScore = score;
        bestRoute = route;
        bestVehicle = vehicle;
      }
    }

    if (bestRoute && bestVehicle) {
      await this.routeGenerationService.addPackageToExistingRoute(
        bestRoute.id,
        pkg.id,
        originDepot.id,
        destinationDepot.id,
        bestVehicle.currentDepotId,
      );
      return bestVehicle;
    }

    return null;
  }

  /**
   * Phase 2: Score ALL available vehicles globally.
   *
   * For long-distance packages, prefers depot trucks that form linear
   * trunk corridors (e.g. Varna → Gabrovo → Sofia) over local hub vehicles.
   *
   * Scoring:
   *  - sweepScore (45%): How linear is home→origin→dest? (1.0 = perfectly on the way)
   *  - trunkScore (40%): Depot trucks for long routes, hub vans for short
   *  - capacityScore (15%): Can the vehicle carry the package?
   */
  private async findBestVehicleGlobally(
    pkg: Package,
    originDepot: Depot,
    destinationDepot: Depot | null,
    packageDist: number,
    depotMap: Map<string, Depot>,
  ): Promise<Vehicle | null> {
    const allVehicles = await this.vehicleRepository.findAllAvailableWithDrivers();
    if (allVehicles.length === 0) return null;

    let bestVehicle: Vehicle | null = null;
    let bestScore = -Infinity;
    const isLongRoute = packageDist > LONG_ROUTE_THRESHOLD_KM;

    for (const vehicle of allVehicles) {
      // Check capacity
      const load = await this.packageRepository.getVehicleLoad(vehicle.id);
      const remainingWeight = Number(vehicle.weightCapacityKg) - load.totalWeightKg;
      const remainingVolume = Number(vehicle.volumeCapacityCbm) - load.totalVolumeCbm;
      if (Number(pkg.weightKg) > remainingWeight || Number(pkg.volumeCbm) > remainingVolume) {
        continue;
      }

      const homeDepot = depotMap.get(vehicle.currentDepotId ?? '');
      if (!homeDepot) continue;

      // --- SWEEP SCORE ---
      // How linear is the path home → origin → destination?
      // High score = the vehicle's home depot is behind the origin in the
      // direction of the destination, forming a natural trunk corridor.
      let sweepScore: number;
      if (!destinationDepot || originDepot.id === destinationDepot.id) {
        const approachDist = haversineDistance(
          Number(homeDepot.latitude),
          Number(homeDepot.longitude),
          Number(originDepot.latitude),
          Number(originDepot.longitude),
        );
        sweepScore = 1 / (1 + approachDist / 100);
      } else if (homeDepot.id === originDepot.id) {
        // Vehicle is AT the origin — decent but doesn't extend the corridor
        sweepScore = 0.7;
      } else {
        const totalRoute = haversineDistance(
          Number(homeDepot.latitude),
          Number(homeDepot.longitude),
          Number(originDepot.latitude),
          Number(originDepot.longitude),
        ) + packageDist;

        const homeToEnd = haversineDistance(
          Number(homeDepot.latitude),
          Number(homeDepot.longitude),
          Number(destinationDepot.latitude),
          Number(destinationDepot.longitude),
        );

        if (homeToEnd < 10) {
          // Round trip (home ≈ destination) — penalize heavily
          sweepScore = 0.2;
        } else {
          // Linearity: if home→origin→dest is a straight line,
          // homeToEnd ≈ totalRoute, ratio → 1.0
          sweepScore = totalRoute > 0 ? homeToEnd / totalRoute : 0;
        }
      }

      // --- TRUNK SCORE ---
      // For long routes: prefer depot-type + truck (trunk vehicles)
      // For short routes: prefer hub-type + van/motorcycle (last-mile)
      let trunkScore: number;
      if (isLongRoute) {
        const isDepotType = homeDepot.type === 'depot';
        const isTruck = vehicle.type === 'truck';
        if (isDepotType && isTruck) trunkScore = 1.0;
        else if (isDepotType) trunkScore = 0.7;
        else if (isTruck) trunkScore = 0.6;
        else trunkScore = 0.3;
      } else {
        const isHub = homeDepot.type === 'hub';
        if (isHub) trunkScore = 0.9;
        else trunkScore = 0.5;
      }

      // --- CAPACITY SCORE ---
      const capacityRatio = Number(pkg.weightKg) / Number(vehicle.weightCapacityKg);
      const capacityScore = Math.min(1.0, capacityRatio * 5);

      // --- FINAL SCORE ---
      const score =
        sweepScore * 0.45 +
        trunkScore * 0.40 +
        capacityScore * 0.15;

      if (score > bestScore) {
        bestScore = score;
        bestVehicle = vehicle;
      }
    }

    if (bestVehicle) {
      const homeDepot = depotMap.get(bestVehicle.currentDepotId ?? '');
      logger.info('Best vehicle selected globally', {
        vehicleId: bestVehicle.id,
        licensePlate: bestVehicle.licensePlate,
        homeDepot: homeDepot?.name,
        score: bestScore.toFixed(3),
        isLongRoute,
      });
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
    return depots.length > 0 ? depots[0]! : null;
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
}
