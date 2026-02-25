import { getPool } from '../config/database.js';
import { Route, RouteListItem, RouteStop, RoutePackage } from '../models/route.model.js';

export class RouteRepository {
  async findAll(
    page: number,
    pageSize: number,
    sortBy: string,
    sortOrder: string,
    statusFilter?: string,
    driverIdFilter?: string,
    dateFromFilter?: string,
    dateToFilter?: string,
  ): Promise<{ items: RouteListItem[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: string[] = [];
    let paramIndex = 1;

    if (statusFilter) {
      conditions.push(`r.status = $${paramIndex++}`);
      params.push(statusFilter);
    }
    if (driverIdFilter) {
      conditions.push(`r.driver_id = $${paramIndex++}`);
      params.push(driverIdFilter);
    }
    if (dateFromFilter) {
      conditions.push(`r.route_date >= $${paramIndex++}::date`);
      params.push(dateFromFilter);
    }
    if (dateToFilter) {
      conditions.push(`r.route_date <= $${paramIndex++}::date`);
      params.push(dateToFilter);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSortColumns: Record<string, string> = {
      routeDate: 'r.route_date',
      status: 'r.status',
      createdAt: 'r.created_at',
    };
    const sortColumn = allowedSortColumns[sortBy] ?? 'r.route_date';
    const direction = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM routes r ${whereClause}`,
      params,
    );

    const offset = (page - 1) * pageSize;
    const result = await pool.query<RouteListItem>(
      `SELECT r.id, r.vehicle_id AS "vehicleId",
              v.license_plate AS "vehicleLicensePlate",
              r.driver_id AS "driverId",
              u.full_name AS "driverName",
              r.route_date AS "routeDate",
              r.status,
              r.approved_by_user_id AS "approvedByUserId",
              r.approved_at AS "approvedAt",
              r.created_at AS "createdAt", r.updated_at AS "updatedAt",
              COALESCE(sc.stop_count, 0)::integer AS "stopCount",
              COALESCE(pc.package_count, 0)::integer AS "packageCount",
              au.full_name AS "approvedByUserName"
       FROM routes r
       JOIN vehicles v ON r.vehicle_id = v.id
       JOIN users u ON r.driver_id = u.id
       LEFT JOIN users au ON r.approved_by_user_id = au.id
       LEFT JOIN (
         SELECT route_id, COUNT(*) AS stop_count FROM route_stops GROUP BY route_id
       ) sc ON sc.route_id = r.id
       LEFT JOIN (
         SELECT route_id, COUNT(*) AS package_count FROM route_packages GROUP BY route_id
       ) pc ON pc.route_id = r.id
       ${whereClause}
       ORDER BY ${sortColumn} ${direction}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, String(pageSize), String(offset)],
    );

    return {
      items: result.rows,
      total: parseInt(countResult.rows[0]?.count ?? '0', 10),
    };
  }

  async findById(id: string): Promise<RouteListItem | null> {
    const pool = getPool();
    const result = await pool.query<RouteListItem>(
      `SELECT r.id, r.vehicle_id AS "vehicleId",
              v.license_plate AS "vehicleLicensePlate",
              r.driver_id AS "driverId",
              u.full_name AS "driverName",
              r.route_date AS "routeDate",
              r.status,
              r.approved_by_user_id AS "approvedByUserId",
              r.approved_at AS "approvedAt",
              r.created_at AS "createdAt", r.updated_at AS "updatedAt",
              v.type AS "vehicleType",
              COALESCE(sc.stop_count, 0)::integer AS "stopCount",
              COALESCE(pc.package_count, 0)::integer AS "packageCount",
              au.full_name AS "approvedByUserName"
       FROM routes r
       JOIN vehicles v ON r.vehicle_id = v.id
       JOIN users u ON r.driver_id = u.id
       LEFT JOIN users au ON r.approved_by_user_id = au.id
       LEFT JOIN (
         SELECT route_id, COUNT(*) AS stop_count FROM route_stops GROUP BY route_id
       ) sc ON sc.route_id = r.id
       LEFT JOIN (
         SELECT route_id, COUNT(*) AS package_count FROM route_packages GROUP BY route_id
       ) pc ON pc.route_id = r.id
       WHERE r.id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findStopsByRouteId(routeId: string): Promise<RouteStop[]> {
    const pool = getPool();
    const result = await pool.query<RouteStop>(
      `SELECT rs.id, rs.route_id AS "routeId",
              rs.depot_id AS "depotId",
              rs.stop_order AS "stopOrder",
              rs.estimated_arrival AS "estimatedArrival",
              rs.actual_arrival AS "actualArrival",
              rs.created_at AS "createdAt"
       FROM route_stops rs
       WHERE rs.route_id = $1
       ORDER BY rs.stop_order ASC`,
      [routeId],
    );
    return result.rows;
  }

  async findPackagesByRouteId(routeId: string): Promise<RoutePackage[]> {
    const pool = getPool();
    const result = await pool.query<RoutePackage>(
      `SELECT id, route_id AS "routeId",
              package_id AS "packageId",
              pickup_stop_id AS "pickupStopId",
              dropoff_stop_id AS "dropoffStopId",
              created_at AS "createdAt"
       FROM route_packages
       WHERE route_id = $1`,
      [routeId],
    );
    return result.rows;
  }

  async create(
    vehicleId: string,
    driverId: string,
    routeDate: string,
  ): Promise<Route> {
    const pool = getPool();
    const result = await pool.query<Route>(
      `INSERT INTO routes (vehicle_id, driver_id, route_date)
       VALUES ($1, $2, $3)
       RETURNING id, vehicle_id AS "vehicleId", driver_id AS "driverId",
                 route_date AS "routeDate", status,
                 approved_by_user_id AS "approvedByUserId",
                 approved_at AS "approvedAt",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [vehicleId, driverId, routeDate],
    );
    return result.rows[0]!;
  }

  async addStop(
    routeId: string,
    depotId: string,
    stopOrder: number,
  ): Promise<RouteStop> {
    const pool = getPool();
    const result = await pool.query<RouteStop>(
      `INSERT INTO route_stops (route_id, depot_id, stop_order)
       VALUES ($1, $2, $3)
       RETURNING id, route_id AS "routeId", depot_id AS "depotId",
                 stop_order AS "stopOrder",
                 estimated_arrival AS "estimatedArrival",
                 actual_arrival AS "actualArrival",
                 created_at AS "createdAt"`,
      [routeId, depotId, stopOrder],
    );
    return result.rows[0]!;
  }

  async addPackageToRoute(
    routeId: string,
    packageId: string,
    pickupStopId: string,
    dropoffStopId: string,
  ): Promise<RoutePackage> {
    const pool = getPool();
    const result = await pool.query<RoutePackage>(
      `INSERT INTO route_packages (route_id, package_id, pickup_stop_id, dropoff_stop_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, route_id AS "routeId", package_id AS "packageId",
                 pickup_stop_id AS "pickupStopId",
                 dropoff_stop_id AS "dropoffStopId",
                 created_at AS "createdAt"`,
      [routeId, packageId, pickupStopId, dropoffStopId],
    );
    return result.rows[0]!;
  }

  async approve(id: string, approvedByUserId: string): Promise<Route | null> {
    const pool = getPool();
    const result = await pool.query<Route>(
      `UPDATE routes
       SET status = 'approved', approved_by_user_id = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id, vehicle_id AS "vehicleId", driver_id AS "driverId",
                 route_date AS "routeDate", status,
                 approved_by_user_id AS "approvedByUserId",
                 approved_at AS "approvedAt",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, approvedByUserId],
    );
    return result.rows[0] ?? null;
  }

  async reject(id: string): Promise<Route | null> {
    const pool = getPool();
    const result = await pool.query<Route>(
      `UPDATE routes
       SET status = 'rejected', updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id, vehicle_id AS "vehicleId", driver_id AS "driverId",
                 route_date AS "routeDate", status,
                 approved_by_user_id AS "approvedByUserId",
                 approved_at AS "approvedAt",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async updateStopOrders(
    routeId: string,
    ordering: { stopId: string; stopOrder: number }[],
  ): Promise<void> {
    if (ordering.length === 0) return;
    const pool = getPool();
    const offset = 10000;

    const whenClause = ordering
      .map((_, i) => `WHEN id = $${i * 2 + 2} THEN $${i * 2 + 3}::integer`)
      .join(' ');
    const ids = ordering.map((_, i) => `$${i * 2 + 2}`).join(', ');

    // Phase 1: shift all to high temporary values to avoid unique constraint conflicts
    const tempParams: (string | number)[] = [routeId];
    for (const { stopId, stopOrder } of ordering) {
      tempParams.push(stopId, stopOrder + offset);
    }
    await pool.query(
      `UPDATE route_stops SET stop_order = CASE ${whenClause} END WHERE route_id = $1 AND id IN (${ids})`,
      tempParams,
    );

    // Phase 2: set to the real values
    const realParams: (string | number)[] = [routeId];
    for (const { stopId, stopOrder } of ordering) {
      realParams.push(stopId, stopOrder);
    }
    await pool.query(
      `UPDATE route_stops SET stop_order = CASE ${whenClause} END WHERE route_id = $1 AND id IN (${ids})`,
      realParams,
    );
  }

  async findByVehicleAndDate(vehicleId: string, routeDate: string): Promise<Route | null> {
    const pool = getPool();
    const result = await pool.query<Route>(
      `SELECT id, vehicle_id AS "vehicleId", driver_id AS "driverId",
              route_date AS "routeDate", status,
              approved_by_user_id AS "approvedByUserId",
              approved_at AS "approvedAt",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM routes
       WHERE vehicle_id = $1 AND route_date = $2`,
      [vehicleId, routeDate],
    );
    return result.rows[0] ?? null;
  }

  async findTodayRouteForDriver(driverId: string): Promise<RouteListItem | null> {
    const pool = getPool();
    const result = await pool.query<RouteListItem>(
      `SELECT r.id, r.vehicle_id AS "vehicleId",
              v.license_plate AS "vehicleLicensePlate",
              r.driver_id AS "driverId",
              u.full_name AS "driverName",
              r.route_date AS "routeDate",
              r.status,
              r.approved_by_user_id AS "approvedByUserId",
              r.approved_at AS "approvedAt",
              r.created_at AS "createdAt", r.updated_at AS "updatedAt",
              COALESCE(sc.stop_count, 0)::integer AS "stopCount",
              COALESCE(pc.package_count, 0)::integer AS "packageCount",
              au.full_name AS "approvedByUserName"
       FROM routes r
       JOIN vehicles v ON r.vehicle_id = v.id
       JOIN users u ON r.driver_id = u.id
       LEFT JOIN users au ON r.approved_by_user_id = au.id
       LEFT JOIN (
         SELECT route_id, COUNT(*) AS stop_count FROM route_stops GROUP BY route_id
       ) sc ON sc.route_id = r.id
       LEFT JOIN (
         SELECT route_id, COUNT(*) AS package_count FROM route_packages GROUP BY route_id
       ) pc ON pc.route_id = r.id
       WHERE r.driver_id = $1
         AND r.route_date = CURRENT_DATE
         AND r.status IN ('approved', 'in_progress')
       LIMIT 1`,
      [driverId],
    );
    return result.rows[0] ?? null;
  }

  async getPackageIdsForRoute(routeId: string): Promise<string[]> {
    const pool = getPool();
    const result = await pool.query<{ packageId: string }>(
      `SELECT package_id AS "packageId" FROM route_packages WHERE route_id = $1`,
      [routeId],
    );
    return result.rows.map((row) => row.packageId);
  }
}
