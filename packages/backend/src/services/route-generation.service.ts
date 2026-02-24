import { RouteRepository } from '../repositories/route.repository.js';
import { Vehicle } from '../models/vehicle.model.js';
import { getPool } from '../config/database.js';
import { logger } from '../utils/logger.js';

const ROUTE_STATUS_PENDING = 'pending';

export class RouteGenerationService {
  private readonly routeRepository: RouteRepository;

  constructor() {
    this.routeRepository = new RouteRepository();
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
