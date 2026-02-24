import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

const MIGRATION_FILE_PATTERN = /^\d{3}-.*\.sql$/;

async function runMigrations(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    process.stderr.write('DATABASE_URL environment variable is required\n');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const currentDirectory = __dirname;
    const migrationFiles = readdirSync(currentDirectory)
      .filter((file) => MIGRATION_FILE_PATTERN.test(file))
      .sort();

    for (const file of migrationFiles) {
      const filePath = join(currentDirectory, file);
      const sql = readFileSync(filePath, 'utf-8');
      process.stdout.write(`Running migration: ${file}...\n`);
      await pool.query(sql);
      process.stdout.write(`  ✓ ${file}\n`);
    }

    process.stdout.write(`\nAll ${migrationFiles.length} migrations completed successfully.\n`);
  } catch (error) {
    process.stderr.write(`Migration failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
