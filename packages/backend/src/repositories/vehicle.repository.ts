import { getPool } from '../config/database.js';
import { Vehicle, VehicleWithDetails } from '../models/vehicle.model.js';
import { TERMINAL_PACKAGE_STATUSES } from '../config/constants.js';

export class VehicleRepository {
  async findAll(
    page: number,
    pageSize: number,
    sortBy: string,
    sortOrder: string,
    typeFilter?: string,
    depotIdFilter?: string,
    statusFilter?: string,
  ): Promise<{ items: VehicleWithDetails[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: string[] = [];
    let paramIndex = 1;

    if (typeFilter) {
      conditions.push(`v.type = $${paramIndex++}`);
      params.push(typeFilter);
    }
    if (depotIdFilter) {
      conditions.push(`v.current_depot_id = $${paramIndex++}`);
      params.push(depotIdFilter);
    }
    if (statusFilter) {
      conditions.push(`v.status = $${paramIndex++}`);
      params.push(statusFilter);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const allowedSortColumns: Record<string, string> = {
      licensePlate: 'v.license_plate',
      type: 'v.type',
      status: 'v.status',
      createdAt: 'v.created_at',
    };
    const sortColumn = allowedSortColumns[sortBy] ?? 'v.license_plate';
    const direction = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM vehicles v ${whereClause}`,
      params,
    );

    const terminalStatuses = Array.from(TERMINAL_PACKAGE_STATUSES);
    const terminalPlaceholders = terminalStatuses.map(
      (_, i) => `$${paramIndex + i}`
    ).join(', ');

    const offset = (page - 1) * pageSize;
    const result = await pool.query<VehicleWithDetails>(
      `SELECT v.id, v.license_plate AS "licensePlate", v.type,
              v.weight_capacity_kg AS "weightCapacityKg",
              v.volume_capacity_cbm AS "volumeCapacityCbm",
              v.current_depot_id AS "currentDepotId",
              d.name AS "currentDepotName",
              v.status,
              v.created_at AS "createdAt", v.updated_at AS "updatedAt",
              COALESCE(load.total_weight, 0)::numeric AS "currentLoadKg",
              COALESCE(load.total_volume, 0)::numeric AS "currentLoadCbm"
       FROM vehicles v
       LEFT JOIN depots d ON v.current_depot_id = d.id
       LEFT JOIN (
         SELECT assigned_vehicle_id,
                SUM(weight_kg) AS total_weight,
                SUM(volume_cbm) AS total_volume
         FROM packages
         WHERE current_status NOT IN (${terminalPlaceholders})
         GROUP BY assigned_vehicle_id
       ) load ON load.assigned_vehicle_id = v.id
       ${whereClause}
       ORDER BY ${sortColumn} ${direction}
       LIMIT $${paramIndex + terminalStatuses.length} OFFSET $${paramIndex + terminalStatuses.length + 1}`,
      [...params, ...terminalStatuses, String(pageSize), String(offset)],
    );

    return {
      items: result.rows.map((row) => ({
        ...row,
        assignedDriver: null,
      })),
      total: parseInt(countResult.rows[0]?.count ?? '0', 10),
    };
  }

  async findById(id: string): Promise<VehicleWithDetails | null> {
    const pool = getPool();
    const terminalStatuses = Array.from(TERMINAL_PACKAGE_STATUSES);
    const terminalPlaceholders = terminalStatuses.map((_, i) => `$${i + 2}`).join(', ');

    const result = await pool.query<VehicleWithDetails>(
      `SELECT v.id, v.license_plate AS "licensePlate", v.type,
              v.weight_capacity_kg AS "weightCapacityKg",
              v.volume_capacity_cbm AS "volumeCapacityCbm",
              v.current_depot_id AS "currentDepotId",
              d.name AS "currentDepotName",
              v.status,
              v.created_at AS "createdAt", v.updated_at AS "updatedAt",
              COALESCE(load.total_weight, 0)::numeric AS "currentLoadKg",
              COALESCE(load.total_volume, 0)::numeric AS "currentLoadCbm"
       FROM vehicles v
       LEFT JOIN depots d ON v.current_depot_id = d.id
       LEFT JOIN (
         SELECT assigned_vehicle_id,
                SUM(weight_kg) AS total_weight,
                SUM(volume_cbm) AS total_volume
         FROM packages
         WHERE current_status NOT IN (${terminalPlaceholders})
         GROUP BY assigned_vehicle_id
       ) load ON load.assigned_vehicle_id = v.id
       WHERE v.id = $1`,
      [id, ...terminalStatuses],
    );

    if (!result.rows[0]) {
      return null;
    }

    const vehicle = result.rows[0];

    const driverResult = await pool.query<{ id: string; fullName: string }>(
      `SELECT id, full_name AS "fullName"
       FROM users
       WHERE vehicle_id = $1`,
      [id],
    );

    return {
      ...vehicle,
      assignedDriver: driverResult.rows[0] ?? null,
    };
  }

  async create(
    licensePlate: string,
    type: string,
    weightCapacityKg: number,
    volumeCapacityCbm: number,
    currentDepotId: string | null,
  ): Promise<Vehicle> {
    const pool = getPool();
    const result = await pool.query<Vehicle>(
      `INSERT INTO vehicles (license_plate, type, weight_capacity_kg, volume_capacity_cbm, current_depot_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, license_plate AS "licensePlate", type,
                 weight_capacity_kg AS "weightCapacityKg",
                 volume_capacity_cbm AS "volumeCapacityCbm",
                 current_depot_id AS "currentDepotId",
                 status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [licensePlate, type, weightCapacityKg, volumeCapacityCbm, currentDepotId],
    );
    return result.rows[0]!;
  }

  async update(
    id: string,
    fields: Record<string, unknown>,
  ): Promise<Vehicle | null> {
    const pool = getPool();
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    const columnMap: Record<string, string> = {
      licensePlate: 'license_plate',
      type: 'type',
      weightCapacityKg: 'weight_capacity_kg',
      volumeCapacityCbm: 'volume_capacity_cbm',
      currentDepotId: 'current_depot_id',
      status: 'status',
    };

    for (const [key, value] of Object.entries(fields)) {
      const column = columnMap[key];
      if (column) {
        setClauses.push(`${column} = $${paramIndex++}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) {
      const found = await this.findById(id);
      return found as Vehicle | null;
    }

    setClauses.push('updated_at = NOW()');
    params.push(id);

    const result = await pool.query<Vehicle>(
      `UPDATE vehicles SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, license_plate AS "licensePlate", type,
                 weight_capacity_kg AS "weightCapacityKg",
                 volume_capacity_cbm AS "volumeCapacityCbm",
                 current_depot_id AS "currentDepotId",
                 status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      params,
    );
    return result.rows[0] ?? null;
  }

  async findAvailableAtDepot(depotId: string): Promise<Vehicle[]> {
    const pool = getPool();
    const result = await pool.query<Vehicle>(
      `SELECT v.id, v.license_plate AS "licensePlate", v.type,
              v.weight_capacity_kg AS "weightCapacityKg",
              v.volume_capacity_cbm AS "volumeCapacityCbm",
              v.current_depot_id AS "currentDepotId",
              v.status, v.created_at AS "createdAt", v.updated_at AS "updatedAt"
       FROM vehicles v
       INNER JOIN users u ON u.vehicle_id = v.id AND u.is_active = TRUE
       WHERE v.current_depot_id = $1 AND v.status = 'available'`,
      [depotId],
    );
    return result.rows;
  }

  async findAllAvailableWithDrivers(): Promise<Vehicle[]> {
    const pool = getPool();
    const result = await pool.query<Vehicle>(
      `SELECT v.id, v.license_plate AS "licensePlate", v.type,
              v.weight_capacity_kg AS "weightCapacityKg",
              v.volume_capacity_cbm AS "volumeCapacityCbm",
              v.current_depot_id AS "currentDepotId",
              v.status, v.created_at AS "createdAt", v.updated_at AS "updatedAt"
       FROM vehicles v
       INNER JOIN users u ON u.vehicle_id = v.id AND u.is_active = TRUE
       WHERE v.status = 'available'`,
    );
    return result.rows;
  }

  async findRawById(id: string): Promise<Vehicle | null> {
    const pool = getPool();
    const result = await pool.query<Vehicle>(
      `SELECT id, license_plate AS "licensePlate", type,
              weight_capacity_kg AS "weightCapacityKg",
              volume_capacity_cbm AS "volumeCapacityCbm",
              current_depot_id AS "currentDepotId",
              status, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM vehicles WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }
}
