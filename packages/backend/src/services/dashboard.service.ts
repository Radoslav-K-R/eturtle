import { getPool } from '../config/database.js';

export interface DashboardStats {
  totalPackages: number;
  pendingRoutes: number;
  activeVehicles: number;
  deliveriesToday: number;
}

export class DashboardService {
  async getStats(): Promise<DashboardStats> {
    const pool = getPool();

    const [packagesResult, routesResult, vehiclesResult, deliveriesResult] = await Promise.all([
      pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM packages'),
      pool.query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM routes WHERE status = 'pending'",
      ),
      pool.query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM vehicles WHERE status = 'in_transit'",
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM deliveries
         WHERE delivered_at >= CURRENT_DATE
           AND delivered_at < CURRENT_DATE + interval '1 day'`,
      ),
    ]);

    return {
      totalPackages: parseInt(packagesResult.rows[0]?.count ?? '0', 10),
      pendingRoutes: parseInt(routesResult.rows[0]?.count ?? '0', 10),
      activeVehicles: parseInt(vehiclesResult.rows[0]?.count ?? '0', 10),
      deliveriesToday: parseInt(deliveriesResult.rows[0]?.count ?? '0', 10),
    };
  }
}
