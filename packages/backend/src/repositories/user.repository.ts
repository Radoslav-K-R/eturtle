import { getPool } from '../config/database.js';
import { User, UserPublic } from '../models/user.model.js';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const pool = getPool();
    const result = await pool.query<User>(
      `SELECT id, email, password_hash AS "passwordHash",
              full_name AS "fullName", role, vehicle_id AS "vehicleId",
              is_active AS "isActive", created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM users
       WHERE email = $1`,
      [email],
    );
    return result.rows[0] ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const pool = getPool();
    const result = await pool.query<User>(
      `SELECT id, email, password_hash AS "passwordHash",
              full_name AS "fullName", role, vehicle_id AS "vehicleId",
              is_active AS "isActive", created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM users
       WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findAll(
    page: number,
    pageSize: number,
    sortBy: string,
    sortOrder: string,
    roleFilter?: string,
    isActiveFilter?: boolean,
  ): Promise<{ items: UserPublic[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: (string | boolean)[] = [];
    let paramIndex = 1;

    if (roleFilter) {
      conditions.push(`u.role = $${paramIndex++}`);
      params.push(roleFilter);
    }
    if (isActiveFilter !== undefined) {
      conditions.push(`u.is_active = $${paramIndex++}`);
      params.push(isActiveFilter);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const allowedSortColumns: Record<string, string> = {
      fullName: 'u.full_name',
      email: 'u.email',
      role: 'u.role',
      createdAt: 'u.created_at',
    };
    const sortColumn = allowedSortColumns[sortBy] ?? 'u.full_name';
    const direction = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM users u ${whereClause}`,
      params,
    );

    const offset = (page - 1) * pageSize;
    const result = await pool.query<UserPublic>(
      `SELECT u.id, u.email, u.full_name AS "fullName", u.role,
              u.vehicle_id AS "vehicleId",
              v.license_plate AS "vehicleLicensePlate",
              u.is_active AS "isActive",
              u.created_at AS "createdAt", u.updated_at AS "updatedAt"
       FROM users u
       LEFT JOIN vehicles v ON u.vehicle_id = v.id
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

  async create(
    email: string,
    passwordHash: string,
    fullName: string,
    role: string,
    vehicleId: string | null,
  ): Promise<User> {
    const pool = getPool();
    const result = await pool.query<User>(
      `INSERT INTO users (email, password_hash, full_name, role, vehicle_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, password_hash AS "passwordHash",
                 full_name AS "fullName", role, vehicle_id AS "vehicleId",
                 is_active AS "isActive", created_at AS "createdAt",
                 updated_at AS "updatedAt"`,
      [email, passwordHash, fullName, role, vehicleId],
    );
    return result.rows[0]!;
  }

  async update(
    id: string,
    fields: Record<string, unknown>,
  ): Promise<User | null> {
    const pool = getPool();
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    const columnMap: Record<string, string> = {
      email: 'email',
      passwordHash: 'password_hash',
      fullName: 'full_name',
      role: 'role',
      vehicleId: 'vehicle_id',
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
      return this.findById(id);
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(id);

    const result = await pool.query<User>(
      `UPDATE users SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, email, password_hash AS "passwordHash",
                 full_name AS "fullName", role, vehicle_id AS "vehicleId",
                 is_active AS "isActive", created_at AS "createdAt",
                 updated_at AS "updatedAt"`,
      params,
    );
    return result.rows[0] ?? null;
  }

  async isVehicleAssigned(vehicleId: string, excludeUserId?: string): Promise<boolean> {
    const pool = getPool();
    let query = 'SELECT COUNT(*) AS count FROM users WHERE vehicle_id = $1';
    const params: string[] = [vehicleId];

    if (excludeUserId) {
      query += ' AND id != $2';
      params.push(excludeUserId);
    }

    const result = await pool.query<{ count: string }>(query, params);
    return parseInt(result.rows[0]?.count ?? '0', 10) > 0;
  }
}
