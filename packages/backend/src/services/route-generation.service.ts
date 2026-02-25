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
      await this.reorderStops(existingRoute.id, vehicle.currentDepotId);
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

    const originStop = await this.routeRepository.addStop(route.id, originDepotId, 1);

    let dropoffStop = originStop;
    if (destinationDepotId !== originDepotId) {
      dropoffStop = await this.routeRepository.addStop(
        route.id,
        destinationDepotId,
        2,
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
    });
  }

  async reorderStops(
    routeId: string,
    startDepotId: string | null,
  ): Promise<void> {
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

    const distanceMatrix = new Map<string, Map<string, number>>();
    for (const stopA of stops) {
      const depotA = depotMap.get(stopA.depotId);
      if (!depotA) continue;
      const row = new Map<string, number>();
      for (const stopB of stops) {
        if (stopA.id === stopB.id) {
          row.set(stopB.id, 0);
          continue;
        }
        const depotB = depotMap.get(stopB.depotId);
        if (!depotB) continue;
        row.set(
          stopB.id,
          haversineDistance(
            Number(depotA.latitude),
            Number(depotA.longitude),
            Number(depotB.latitude),
            Number(depotB.longitude),
          ),
        );
      }
      distanceMatrix.set(stopA.id, row);
    }

    let startStop = stops[0]!;
    if (startDepotId) {
      const found = stops.find((s) => s.depotId === startDepotId);
      if (found) {
        startStop = found;
      }
    }

    const visited = new Set<string>([startStop.id]);
    const ordered: RouteStop[] = [startStop];
    let current = startStop;

    while (visited.size < stops.length) {
      let nearestStop: RouteStop | null = null;
      let nearestDist = Infinity;

      const currentDistances = distanceMatrix.get(current.id);
      for (const stop of stops) {
        if (visited.has(stop.id)) continue;
        const dist = currentDistances?.get(stop.id) ?? Infinity;
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestStop = stop;
        }
      }

      if (!nearestStop) break;
      visited.add(nearestStop.id);
      ordered.push(nearestStop);
      current = nearestStop;
    }

    const routePackages = await this.routeRepository.findPackagesByRouteId(routeId);
    const stopOrderMap = new Map(
      ordered.map((stop, idx) => [stop.id, idx + 1]),
    );

    for (const rp of routePackages) {
      const pickupOrder = stopOrderMap.get(rp.pickupStopId) ?? 0;
      const dropoffOrder = stopOrderMap.get(rp.dropoffStopId) ?? 0;
      if (pickupOrder > dropoffOrder && rp.pickupStopId !== rp.dropoffStopId) {
        const pickupIdx = ordered.findIndex((s) => s.id === rp.pickupStopId);
        const dropoffIdx = ordered.findIndex((s) => s.id === rp.dropoffStopId);
        if (pickupIdx > dropoffIdx && pickupIdx >= 0 && dropoffIdx >= 0) {
          const [removed] = ordered.splice(pickupIdx, 1);
          ordered.splice(dropoffIdx, 0, removed!);
          for (let i = 0; i < ordered.length; i++) {
            stopOrderMap.set(ordered[i]!.id, i + 1);
          }
        }
      }
    }

    const ordering = ordered.map((stop, idx) => ({
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
