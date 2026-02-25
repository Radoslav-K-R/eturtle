import { RouteRepository } from '../repositories/route.repository.js';
import { DepotRepository } from '../repositories/depot.repository.js';
import { Vehicle } from '../models/vehicle.model.js';
import { Depot } from '../models/depot.model.js';
import { RouteStop } from '../models/route.model.js';
import { getPool } from '../config/database.js';
import { logger } from '../utils/logger.js';

const ROUTE_STATUS_PENDING = 'pending';
const EARTH_RADIUS_KM = 6371;
const DEGREES_TO_RADIANS = Math.PI / 180;

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

export class RouteGenerationService {
  private readonly routeRepository: RouteRepository;
  private readonly depotRepository: DepotRepository;

  constructor() {
    this.routeRepository = new RouteRepository();
    this.depotRepository = new DepotRepository();
  }

  async generateRoute(
    vehicle: Vehicle,
    packageId: string,
    originDepotId: string,
    destinationDepotId: string,
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0]!;

    const existingRoute = await this.routeRepository.findByVehicleAndDate(
      vehicle.id,
      today,
    );

    if (existingRoute && existingRoute.status === ROUTE_STATUS_PENDING) {
      await this.addToExistingRoute(
        existingRoute.id,
        packageId,
        originDepotId,
        destinationDepotId,
      );
      await this.reorderStops(existingRoute.id);
      logger.info('Package added to existing route', {
        routeId: existingRoute.id,
        packageId,
      });
      return;
    }

    const driverId = await this.findDriverForVehicle(vehicle.id);
    if (!driverId) {
      logger.warn('No driver assigned to vehicle, cannot generate route', {
        vehicleId: vehicle.id,
      });
      return;
    }

    const route = await this.routeRepository.create(vehicle.id, driverId, today);

    let stopOrder = 1;

    const originStop = await this.routeRepository.addStop(route.id, originDepotId, stopOrder++);

    let dropoffStop = originStop;
    if (destinationDepotId !== originDepotId) {
      dropoffStop = await this.routeRepository.addStop(
        route.id,
        destinationDepotId,
        stopOrder++,
      );
    }

    await this.routeRepository.addPackageToRoute(
      route.id,
      packageId,
      originStop.id,
      dropoffStop.id,
    );

    logger.info('Route generated', {
      routeId: route.id,
      vehicleId: vehicle.id,
      packageId,
      stopCount: stopOrder - 1,
    });
  }

  /**
   * Public method for the assignment service to add a package to
   * an already-identified existing route (from the consolidation phase).
   */
  async addPackageToExistingRoute(
    routeId: string,
    packageId: string,
    originDepotId: string,
    destinationDepotId: string,
  ): Promise<void> {
    await this.addToExistingRoute(routeId, packageId, originDepotId, destinationDepotId);
    await this.reorderStops(routeId);
    logger.info('Package consolidated into existing route', {
      routeId,
      packageId,
    });
  }

  /**
   * Reorder stops to minimize total distance while respecting
   * pickup-before-dropoff constraints for every package.
   *
   * Uses nearest-neighbor heuristic starting from every possible stop,
   * picks the permutation with the shortest total distance that still
   * satisfies all precedence constraints.
   */
  async reorderStops(routeId: string): Promise<void> {
    const stops = await this.routeRepository.findStopsByRouteId(routeId);
    if (stops.length <= 2) {
      return;
    }

    const depotMap = new Map<string, Depot>();
    for (const stop of stops) {
      if (!depotMap.has(stop.depotId)) {
        const depot = await this.depotRepository.findById(stop.depotId);
        if (depot) {
          depotMap.set(stop.depotId, depot);
        }
      }
    }

    // Build distance matrix
    const dist = (a: RouteStop, b: RouteStop): number => {
      const dA = depotMap.get(a.depotId);
      const dB = depotMap.get(b.depotId);
      if (!dA || !dB) return Infinity;
      return haversineDistance(
        Number(dA.latitude), Number(dA.longitude),
        Number(dB.latitude), Number(dB.longitude),
      );
    };

    // Build precedence constraints: pickup stop must come before dropoff stop
    const routePackages = await this.routeRepository.findPackagesByRouteId(routeId);
    const mustPrecede: Array<{ before: string; after: string }> = [];
    for (const rp of routePackages) {
      if (rp.pickupStopId !== rp.dropoffStopId) {
        mustPrecede.push({ before: rp.pickupStopId, after: rp.dropoffStopId });
      }
    }

    const satisfiesConstraints = (ordered: RouteStop[]): boolean => {
      const posMap = new Map(ordered.map((s, i) => [s.id, i]));
      for (const { before, after } of mustPrecede) {
        const bPos = posMap.get(before);
        const aPos = posMap.get(after);
        if (bPos != null && aPos != null && bPos >= aPos) return false;
      }
      return true;
    };

    const totalDist = (ordered: RouteStop[]): number => {
      let total = 0;
      for (let i = 0; i < ordered.length - 1; i++) {
        total += dist(ordered[i]!, ordered[i + 1]!);
      }
      return total;
    };

    // Try nearest-neighbor from each possible starting stop
    let bestOrdering: RouteStop[] = stops;
    let bestDist = Infinity;

    for (const startStop of stops) {
      const visited = new Set<string>([startStop.id]);
      const ordered: RouteStop[] = [startStop];
      let current = startStop;

      while (visited.size < stops.length) {
        let nearestStop: RouteStop | null = null;
        let nearestD = Infinity;
        for (const stop of stops) {
          if (visited.has(stop.id)) continue;
          const d = dist(current, stop);
          if (d < nearestD) {
            nearestD = d;
            nearestStop = stop;
          }
        }
        if (!nearestStop) break;
        visited.add(nearestStop.id);
        ordered.push(nearestStop);
        current = nearestStop;
      }

      // Fix constraint violations by moving pickup stops before their dropoffs
      for (const { before, after } of mustPrecede) {
        const pickupIdx = ordered.findIndex((s) => s.id === before);
        const dropoffIdx = ordered.findIndex((s) => s.id === after);
        if (pickupIdx >= 0 && dropoffIdx >= 0 && pickupIdx > dropoffIdx) {
          const [removed] = ordered.splice(pickupIdx, 1);
          ordered.splice(dropoffIdx, 0, removed!);
        }
      }

      if (satisfiesConstraints(ordered)) {
        const d = totalDist(ordered);
        if (d < bestDist) {
          bestDist = d;
          bestOrdering = ordered;
        }
      }
    }

    const ordering = bestOrdering.map((stop, idx) => ({
      stopId: stop.id,
      stopOrder: idx + 1,
    }));

    await this.routeRepository.updateStopOrders(routeId, ordering);
  }

  private async addToExistingRoute(
    routeId: string,
    packageId: string,
    originDepotId: string,
    destinationDepotId: string,
  ): Promise<void> {
    const existingStops = await this.routeRepository.findStopsByRouteId(routeId);

    let pickupStop = existingStops.find((stop) => stop.depotId === originDepotId);
    if (!pickupStop) {
      const nextOrder = existingStops.length + 1;
      pickupStop = await this.routeRepository.addStop(routeId, originDepotId, nextOrder);
    }

    let dropoffStop = existingStops.find((stop) => stop.depotId === destinationDepotId);
    if (!dropoffStop) {
      if (destinationDepotId === originDepotId) {
        dropoffStop = pickupStop;
      } else {
        const allStops = await this.routeRepository.findStopsByRouteId(routeId);
        const nextOrder = allStops.length + 1;
        dropoffStop = await this.routeRepository.addStop(
          routeId,
          destinationDepotId,
          nextOrder,
        );
      }
    }

    await this.routeRepository.addPackageToRoute(
      routeId,
      packageId,
      pickupStop.id,
      dropoffStop.id,
    );
  }

  private async findDriverForVehicle(vehicleId: string): Promise<string | null> {
    const pool = getPool();
    const result = await pool.query<{ id: string }>(
      'SELECT id FROM users WHERE vehicle_id = $1 AND is_active = TRUE',
      [vehicleId],
    );
    return result.rows[0]?.id ?? null;
  }
}
