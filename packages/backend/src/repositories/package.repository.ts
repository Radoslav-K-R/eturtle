import { getPool } from '../config/database.js';
import { Package, PackageWithDetails, PackageStatusHistoryEntry } from '../models/package.model.js';

export class PackageRepository {
  async findAll(
    page: number,
    pageSize: number,
    sortBy: string,
    sortOrder: string,
    statusFilter?: string,
    originDepotIdFilter?: string,
    destinationDepotIdFilter?: string,
  ): Promise<{ items: PackageWithDetails[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: string[] = [];
    let paramIndex = 1;

    if (statusFilter) {
      conditions.push(`p.current_status = $${paramIndex++}`);
      params.push(statusFilter);
    }
    if (originDepotIdFilter) {
      conditions.push(`p.origin_depot_id = $${paramIndex++}`);
      params.push(originDepotIdFilter);
    }
    if (destinationDepotIdFilter) {
      conditions.push(`p.destination_depot_id = $${paramIndex++}`);
      params.push(destinationDepotIdFilter);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const allowedSortColumns: Record<string, string> = {
      trackingNumber: 'p.tracking_number',
      currentStatus: 'p.current_status',
      weightKg: 'p.weight_kg',
      createdAt: 'p.created_at',
    };
    const sortColumn = allowedSortColumns[sortBy] ?? 'p.created_at';
    const direction = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM packages p ${whereClause}`,
      params,
    );

    const offset = (page - 1) * pageSize;
    const result = await pool.query<PackageWithDetails>(
      `SELECT p.id, p.tracking_number AS "trackingNumber",
              p.origin_address AS "originAddress",
              p.origin_depot_id AS "originDepotId",
              od.name AS "originDepotName",
              p.destination_address AS "destinationAddress",
              p.destination_depot_id AS "destinationDepotId",
              dd.name AS "destinationDepotName",
              p.weight_kg AS "weightKg",
              p.length_cm AS "lengthCm",
              p.width_cm AS "widthCm",
              p.height_cm AS "heightCm",
              p.volume_cbm AS "volumeCbm",
              p.contents_description AS "contentsDescription",
              p.current_status AS "currentStatus",
              p.assigned_vehicle_id AS "assignedVehicleId",
              v.license_plate AS "assignedVehicleLicensePlate",
              p.origin_latitude AS "originLatitude",
              p.origin_longitude AS "originLongitude",
              p.destination_latitude AS "destinationLatitude",
              p.destination_longitude AS "destinationLongitude",
              p.created_at AS "createdAt", p.updated_at AS "updatedAt"
       FROM packages p
       LEFT JOIN depots od ON p.origin_depot_id = od.id
       LEFT JOIN depots dd ON p.destination_depot_id = dd.id
       LEFT JOIN vehicles v ON p.assigned_vehicle_id = v.id
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

  async findById(id: string): Promise<PackageWithDetails | null> {
    const pool = getPool();
    const result = await pool.query<PackageWithDetails>(
      `SELECT p.id, p.tracking_number AS "trackingNumber",
              p.origin_address AS "originAddress",
              p.origin_depot_id AS "originDepotId",
              od.name AS "originDepotName",
              p.destination_address AS "destinationAddress",
              p.destination_depot_id AS "destinationDepotId",
              dd.name AS "destinationDepotName",
              p.weight_kg AS "weightKg",
              p.length_cm AS "lengthCm",
              p.width_cm AS "widthCm",
              p.height_cm AS "heightCm",
              p.volume_cbm AS "volumeCbm",
              p.contents_description AS "contentsDescription",
              p.current_status AS "currentStatus",
              p.assigned_vehicle_id AS "assignedVehicleId",
              v.license_plate AS "assignedVehicleLicensePlate",
              p.origin_latitude AS "originLatitude",
              p.origin_longitude AS "originLongitude",
              p.destination_latitude AS "destinationLatitude",
              p.destination_longitude AS "destinationLongitude",
              p.created_at AS "createdAt", p.updated_at AS "updatedAt"
       FROM packages p
       LEFT JOIN depots od ON p.origin_depot_id = od.id
       LEFT JOIN depots dd ON p.destination_depot_id = dd.id
       LEFT JOIN vehicles v ON p.assigned_vehicle_id = v.id
       WHERE p.id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findStatusHistory(packageId: string): Promise<PackageStatusHistoryEntry[]> {
    const pool = getPool();
    const result = await pool.query<PackageStatusHistoryEntry>(
      `SELECT h.id, h.status,
              h.changed_by_user_id AS "changedByUserId",
              COALESCE(u.full_name, 'System') AS "changedByUserName",
              h.note,
              h.created_at AS "createdAt"
       FROM package_status_history h
       LEFT JOIN users u ON h.changed_by_user_id = u.id
       WHERE h.package_id = $1
       ORDER BY h.created_at ASC`,
      [packageId],
    );
    return result.rows;
  }

  async create(
    trackingNumber: string,
    originAddress: string,
    destinationAddress: string,
    weightKg: number,
    lengthCm: number,
    widthCm: number,
    heightCm: number,
    contentsDescription: string | null,
    originLatitude: number | null = null,
    originLongitude: number | null = null,
    destinationLatitude: number | null = null,
    destinationLongitude: number | null = null,
  ): Promise<Package> {
    const pool = getPool();
    const result = await pool.query<Package>(
      `INSERT INTO packages (tracking_number, origin_address, destination_address,
                             weight_kg, length_cm, width_cm, height_cm, contents_description,
                             origin_latitude, origin_longitude,
                             destination_latitude, destination_longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, tracking_number AS "trackingNumber",
                 origin_address AS "originAddress",
                 origin_depot_id AS "originDepotId",
                 destination_address AS "destinationAddress",
                 destination_depot_id AS "destinationDepotId",
                 weight_kg AS "weightKg", length_cm AS "lengthCm",
                 width_cm AS "widthCm", height_cm AS "heightCm",
                 volume_cbm AS "volumeCbm",
                 contents_description AS "contentsDescription",
                 current_status AS "currentStatus",
                 assigned_vehicle_id AS "assignedVehicleId",
                 origin_latitude AS "originLatitude",
                 origin_longitude AS "originLongitude",
                 destination_latitude AS "destinationLatitude",
                 destination_longitude AS "destinationLongitude",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [trackingNumber, originAddress, destinationAddress, weightKg, lengthCm, widthCm, heightCm,
       contentsDescription, originLatitude, originLongitude, destinationLatitude, destinationLongitude],
    );
    return result.rows[0]!;
  }

  async updateStatus(
    id: string,
    status: string,
    changedByUserId: string | null,
    note: string | null,
  ): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE packages SET current_status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id],
    );
    await pool.query(
      `INSERT INTO package_status_history (package_id, status, changed_by_user_id, note)
       VALUES ($1, $2, $3, $4)`,
      [id, status, changedByUserId, note],
    );
  }

  async updateFields(id: string, fields: Record<string, unknown>): Promise<Package | null> {
    const pool = getPool();
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    const columnMap: Record<string, string> = {
      originAddress: 'origin_address',
      destinationAddress: 'destination_address',
      weightKg: 'weight_kg',
      lengthCm: 'length_cm',
      widthCm: 'width_cm',
      heightCm: 'height_cm',
      contentsDescription: 'contents_description',
      assignedVehicleId: 'assigned_vehicle_id',
      originDepotId: 'origin_depot_id',
      destinationDepotId: 'destination_depot_id',
      originLatitude: 'origin_latitude',
      originLongitude: 'origin_longitude',
      destinationLatitude: 'destination_latitude',
      destinationLongitude: 'destination_longitude',
    };

    for (const [key, value] of Object.entries(fields)) {
      const column = columnMap[key];
      if (column) {
        setClauses.push(`${column} = $${paramIndex++}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) {
      return this.findById(id) as Promise<Package | null>;
    }

    setClauses.push('updated_at = NOW()');
    params.push(id);

    const result = await pool.query<Package>(
      `UPDATE packages SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, tracking_number AS "trackingNumber",
                 origin_address AS "originAddress",
                 origin_depot_id AS "originDepotId",
                 destination_address AS "destinationAddress",
                 destination_depot_id AS "destinationDepotId",
                 weight_kg AS "weightKg", length_cm AS "lengthCm",
                 width_cm AS "widthCm", height_cm AS "heightCm",
                 volume_cbm AS "volumeCbm",
                 contents_description AS "contentsDescription",
                 current_status AS "currentStatus",
                 assigned_vehicle_id AS "assignedVehicleId",
                 origin_latitude AS "originLatitude",
                 origin_longitude AS "originLongitude",
                 destination_latitude AS "destinationLatitude",
                 destination_longitude AS "destinationLongitude",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      params,
    );
    return result.rows[0] ?? null;
  }

  async getRawById(id: string): Promise<Package | null> {
    const pool = getPool();
    const result = await pool.query<Package>(
      `SELECT id, tracking_number AS "trackingNumber",
              origin_address AS "originAddress",
              origin_depot_id AS "originDepotId",
              destination_address AS "destinationAddress",
              destination_depot_id AS "destinationDepotId",
              weight_kg AS "weightKg", length_cm AS "lengthCm",
              width_cm AS "widthCm", height_cm AS "heightCm",
              volume_cbm AS "volumeCbm",
              contents_description AS "contentsDescription",
              current_status AS "currentStatus",
              assigned_vehicle_id AS "assignedVehicleId",
              origin_latitude AS "originLatitude",
              origin_longitude AS "originLongitude",
              destination_latitude AS "destinationLatitude",
              destination_longitude AS "destinationLongitude",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM packages WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async getVehicleLoad(vehicleId: string): Promise<{ totalWeightKg: number; totalVolumeCbm: number }> {
    const pool = getPool();
    const result = await pool.query<{ totalWeightKg: string; totalVolumeCbm: string }>(
      `SELECT COALESCE(SUM(weight_kg), 0) AS "totalWeightKg",
              COALESCE(SUM(volume_cbm), 0) AS "totalVolumeCbm"
       FROM packages
       WHERE assigned_vehicle_id = $1
         AND current_status NOT IN ('delivered', 'returned', 'cancelled')`,
      [vehicleId],
    );
    const row = result.rows[0]!;
    return {
      totalWeightKg: parseFloat(row.totalWeightKg),
      totalVolumeCbm: parseFloat(row.totalVolumeCbm),
    };
  }
}
