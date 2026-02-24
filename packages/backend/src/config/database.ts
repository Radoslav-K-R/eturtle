import { Pool } from 'pg';
import { logger } from '../utils/logger.js';

let pool: Pool;

export function initializeDatabase(databaseUrl: string): Pool {
  pool = new Pool({
    connectionString: databaseUrl,
  });

  pool.on('error', (error) => {
    logger.error('Unexpected database pool error', { error: error.message });
  });

  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info('Database pool closed');
  }
}
