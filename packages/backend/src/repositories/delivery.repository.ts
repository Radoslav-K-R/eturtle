import { getPool } from '../config/database.js';
import { Delivery, DeliveryWithDetails } from '../models/delivery.model.js';

export class DeliveryRepository {
  async findAll(
    page: number,
    pageSize: number,
    sortBy: string,
    sortOrder: string,
    driverIdFilter?: string,
    dateFromFilter?: string,
    dateToFilter?: string,
  ): Promise<{ items: DeliveryWithDetails[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: string[] = [];
    let paramIndex = 1;

    if (driverIdFilter) {
      conditions.push(`del.driver_id = $${paramIndex++}`);
      params.push(driverIdFilter);
    }
    if (dateFromFilter) {
      conditions.push(`del.delivered_at >= $${paramIndex++}::date`);
      params.push(dateFromFilter);
    }
    if (dateToFilter) {
      conditions.push(`del.delivered_at < ($${paramIndex++}::date + interval '1 day')`);
      params.push(dateToFilter);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const allowedSortColumns: Record<string, string> = {
      deliveredAt: 'del.delivered_at',
      createdAt: 'del.created_at',
    };
    const sortColumn = allowedSortColumns[sortBy] ?? 'del.delivered_at';
    const direction = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM deliveries del ${whereClause}`,
      params,
    );

    const offset = (page - 1) * pageSize;
    const result = await pool.query<DeliveryWithDetails>(
      `SELECT del.id, del.package_id AS "packageId",
              p.tracking_number AS "trackingNumber",
              p.destination_address AS "destinationAddress",
              del.route_id AS "routeId",
              del.driver_id AS "driverId",
              u.full_name AS "driverName",
              del.delivered_at AS "deliveredAt",
              del.note,
              del.created_at AS "createdAt"
       FROM deliveries del
       JOIN packages p ON del.package_id = p.id
       JOIN users u ON del.driver_id = u.id
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

  async findById(id: string): Promise<DeliveryWithDetails | null> {
    const pool = getPool();
    const result = await pool.query<DeliveryWithDetails>(
      `SELECT del.id, del.package_id AS "packageId",
              p.tracking_number AS "trackingNumber",
              p.destination_address AS "destinationAddress",
              del.route_id AS "routeId",
              del.driver_id AS "driverId",
              u.full_name AS "driverName",
              del.delivered_at AS "deliveredAt",
              del.note,
              del.created_at AS "createdAt"
       FROM deliveries del
       JOIN packages p ON del.package_id = p.id
       JOIN users u ON del.driver_id = u.id
       WHERE del.id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async create(
    packageId: string,
    routeId: string,
    driverId: string,
    note: string | null,
  ): Promise<Delivery> {
    const pool = getPool();
    const result = await pool.query<Delivery>(
      `INSERT INTO deliveries (package_id, route_id, driver_id, note)
       VALUES ($1, $2, $3, $4)
       RETURNING id, package_id AS "packageId", route_id AS "routeId",
                 driver_id AS "driverId", delivered_at AS "deliveredAt",
                 note, created_at AS "createdAt"`,
      [packageId, routeId, driverId, note],
    );
    return result.rows[0]!;
  }

  async countTodayDeliveries(): Promise<number> {
    const pool = getPool();
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM deliveries
       WHERE delivered_at >= CURRENT_DATE
         AND delivered_at < CURRENT_DATE + interval '1 day'`,
    );
    return parseInt(result.rows[0]?.count ?? '0', 10);
  }
}
