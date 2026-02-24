import { getPool } from '../config/database.js';
import { Depot, DepotWithVehicleCount } from '../models/depot.model.js';

export class DepotRepository {
  async findAll(
    page: number,
    pageSize: number,
    sortBy: string,
    sortOrder: string,
    isActiveFilter?: boolean,
  ): Promise<{ items: DepotWithVehicleCount[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: (string | boolean)[] = [];
    let paramIndex = 1;

    if (isActiveFilter !== undefined) {
      conditions.push(`d.is_active = $${paramIndex++}`);
      params.push(isActiveFilter);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const allowedSortColumns: Record<string, string> = {
      name: 'd.name',
      address: 'd.address',
      createdAt: 'd.created_at',
    };
    const sortColumn = allowedSortColumns[sortBy] ?? 'd.name';
    const direction = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM depots d ${whereClause}`,
      params,
    );

    const offset = (page - 1) * pageSize;
    const result = await pool.query<DepotWithVehicleCount>(
      `SELECT d.id, d.name, d.address, d.latitude, d.longitude,
              d.is_active AS "isActive",
              d.created_at AS "createdAt", d.updated_at AS "updatedAt",
              COALESCE(vc.vehicle_count, 0)::integer AS "vehicleCount"
       FROM depots d
       LEFT JOIN (
         SELECT current_depot_id, COUNT(*) AS vehicle_count
         FROM vehicles
         GROUP BY current_depot_id
       ) vc ON vc.current_depot_id = d.id
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

  async findById(id: string): Promise<DepotWithVehicleCount | null> {
    const pool = getPool();
    const result = await pool.query<DepotWithVehicleCount>(
      `SELECT d.id, d.name, d.address, d.latitude, d.longitude,
              d.is_active AS "isActive",
              d.created_at AS "createdAt", d.updated_at AS "updatedAt",
              COALESCE(vc.vehicle_count, 0)::integer AS "vehicleCount"
       FROM depots d
       LEFT JOIN (
         SELECT current_depot_id, COUNT(*) AS vehicle_count
         FROM vehicles
         GROUP BY current_depot_id
       ) vc ON vc.current_depot_id = d.id
       WHERE d.id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async create(
    name: string,
    address: string,
    latitude: number,
    longitude: number,
  ): Promise<Depot> {
    const pool = getPool();
    const result = await pool.query<Depot>(
      `INSERT INTO depots (name, address, latitude, longitude)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, address, latitude, longitude,
                 is_active AS "isActive",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [name, address, latitude, longitude],
    );
    return result.rows[0]!;
  }

  async update(
    id: string,
    fields: Record<string, unknown>,
  ): Promise<Depot | null> {
    const pool = getPool();
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    const columnMap: Record<string, string> = {
      name: 'name',
      address: 'address',
      latitude: 'latitude',
      longitude: 'longitude',
      isActive: 'is_active',
    };

    for (const [key, value] of Object.entries(fields)) {
      const column = columnMap[key];
      if (column) {
        setClauses.push(`${column} = $${paramIndex++}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) {
      return this.findById(id) as Promise<Depot | null>;
    }

    setClauses.push('updated_at = NOW()');
    params.push(id);

    const result = await pool.query<Depot>(
      `UPDATE depots SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, address, latitude, longitude,
                 is_active AS "isActive",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      params,
    );
    return result.rows[0] ?? null;
  }

  async findAllActive(): Promise<Depot[]> {
    const pool = getPool();
    const result = await pool.query<Depot>(
      `SELECT id, name, address, latitude, longitude,
              is_active AS "isActive",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM depots
       WHERE is_active = TRUE
       ORDER BY name ASC`,
    );
    return result.rows;
  }
}
