import { RouteRepository } from '../repositories/route.repository.js';
import { PackageRepository } from '../repositories/package.repository.js';
import { RouteListItem, RouteWithDetails, RouteStopWithPackages } from '../models/route.model.js';
import { AppError } from '../middleware/error-handler.js';
import { PAGINATION_DEFAULTS, PACKAGE_STATUSES, VEHICLE_STATUSES } from '../config/constants.js';
import { getPool } from '../config/database.js';

const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;

export class RouteService {
  private readonly routeRepository: RouteRepository;
  private readonly packageRepository: PackageRepository;

  constructor() {
    this.routeRepository = new RouteRepository();
    this.packageRepository = new PackageRepository();
  }

  async findAll(
    page: number = PAGINATION_DEFAULTS.PAGE,
    pageSize: number = PAGINATION_DEFAULTS.PAGE_SIZE,
    sortBy: string = 'routeDate',
    sortOrder: string = 'desc',
    status?: string,
    driverId?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{ items: RouteListItem[]; total: number }> {
    return this.routeRepository.findAll(
      page, pageSize, sortBy, sortOrder, status, driverId, dateFrom, dateTo,
    );
  }

  async findById(id: string): Promise<RouteWithDetails> {
    const route = await this.routeRepository.findById(id);
    if (!route) {
      throw new AppError('Route not found', HTTP_NOT_FOUND);
    }

    const stops = await this.routeRepository.findStopsByRouteId(id);
    const routePackages = await this.routeRepository.findPackagesByRouteId(id);

    const pool = getPool();
    const stopsWithPackages: RouteStopWithPackages[] = [];

    for (const stop of stops) {
      const depotResult = await pool.query<{ name: string; latitude: string | null; longitude: string | null }>(
        'SELECT name, latitude, longitude FROM depots WHERE id = $1',
        [stop.depotId],
      );
      const depotRow = depotResult.rows[0];
      const depotName = depotRow?.name ?? 'Unknown';
      const depotLatitude = depotRow?.latitude != null ? Number(depotRow.latitude) : null;
      const depotLongitude = depotRow?.longitude != null ? Number(depotRow.longitude) : null;

      const pickupPackageIds = routePackages
        .filter((rp) => rp.pickupStopId === stop.id)
        .map((rp) => rp.packageId);
      const dropoffPackageIds = routePackages
        .filter((rp) => rp.dropoffStopId === stop.id)
        .map((rp) => rp.packageId);

      const pickupPackages = [];
      for (const pkgId of pickupPackageIds) {
        const pkgResult = await pool.query<{ id: string; trackingNumber: string; destinationAddress: string; destinationLatitude: string | null; destinationLongitude: string | null }>(
          `SELECT id, tracking_number AS "trackingNumber",
                  destination_address AS "destinationAddress",
                  destination_latitude AS "destinationLatitude",
                  destination_longitude AS "destinationLongitude"
           FROM packages WHERE id = $1`,
          [pkgId],
        );
        if (pkgResult.rows[0]) {
          const row = pkgResult.rows[0];
          pickupPackages.push({
            id: row.id,
            trackingNumber: row.trackingNumber,
            destinationAddress: row.destinationAddress,
            destinationLatitude: row.destinationLatitude != null ? Number(row.destinationLatitude) : null,
            destinationLongitude: row.destinationLongitude != null ? Number(row.destinationLongitude) : null,
          });
        }
      }

      const dropoffPackages = [];
      for (const pkgId of dropoffPackageIds) {
        const pkgResult = await pool.query<{ id: string; trackingNumber: string; destinationAddress: string; destinationLatitude: string | null; destinationLongitude: string | null }>(
          `SELECT id, tracking_number AS "trackingNumber",
                  destination_address AS "destinationAddress",
                  destination_latitude AS "destinationLatitude",
                  destination_longitude AS "destinationLongitude"
           FROM packages WHERE id = $1`,
          [pkgId],
        );
        if (pkgResult.rows[0]) {
          const row = pkgResult.rows[0];
          dropoffPackages.push({
            id: row.id,
            trackingNumber: row.trackingNumber,
            destinationAddress: row.destinationAddress,
            destinationLatitude: row.destinationLatitude != null ? Number(row.destinationLatitude) : null,
            destinationLongitude: row.destinationLongitude != null ? Number(row.destinationLongitude) : null,
          });
        }
      }

      stopsWithPackages.push({
        ...stop,
        depotName,
        depotLatitude,
        depotLongitude,
        pickupPackages,
        dropoffPackages,
      });
    }

    return {
      ...route,
      vehicleType: (route as RouteWithDetails).vehicleType ?? '',
      stops: stopsWithPackages,
    };
  }

  async approve(id: string, approvedByUserId: string): Promise<RouteWithDetails> {
    const route = await this.routeRepository.findById(id);
    if (!route) {
      throw new AppError('Route not found', HTTP_NOT_FOUND);
    }
    if (route.status !== 'pending') {
      throw new AppError('Only pending routes can be approved', HTTP_BAD_REQUEST);
    }

    const approved = await this.routeRepository.approve(id, approvedByUserId);
    if (!approved) {
      throw new AppError('Failed to approve route', HTTP_BAD_REQUEST);
    }

    const packageIds = await this.routeRepository.getPackageIdsForRoute(id);
    for (const packageId of packageIds) {
      await this.packageRepository.updateStatus(
        packageId,
        PACKAGE_STATUSES.IN_TRANSIT,
        approvedByUserId,
        'Route approved - package in transit',
      );
    }

    const pool = getPool();
    await pool.query(
      `UPDATE vehicles SET status = $1, updated_at = NOW() WHERE id = $2`,
      [VEHICLE_STATUSES.IN_TRANSIT, approved.vehicleId],
    );

    return this.findById(id);
  }

  async reject(id: string, reason?: string): Promise<RouteWithDetails> {
    const route = await this.routeRepository.findById(id);
    if (!route) {
      throw new AppError('Route not found', HTTP_NOT_FOUND);
    }
    if (route.status !== 'pending') {
      throw new AppError('Only pending routes can be rejected', HTTP_BAD_REQUEST);
    }

    const rejected = await this.routeRepository.reject(id);
    if (!rejected) {
      throw new AppError('Failed to reject route', HTTP_BAD_REQUEST);
    }

    const packageIds = await this.routeRepository.getPackageIdsForRoute(id);
    for (const packageId of packageIds) {
      await this.packageRepository.updateStatus(
        packageId,
        PACKAGE_STATUSES.REGISTERED,
        null,
        reason ?? 'Route rejected - package unassigned',
      );
      await this.packageRepository.updateFields(packageId, { assignedVehicleId: null });
    }

    return this.findById(id);
  }
}
