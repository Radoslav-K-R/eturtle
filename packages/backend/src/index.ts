import { validateEnvironment } from './config/environment.js';
import { initializeDatabase } from './config/database.js';
import { createServer } from './server.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  try {
    const config = validateEnvironment();
    logger.info('Environment validated', { nodeEnv: config.NODE_ENV });

    initializeDatabase(config.DATABASE_URL);
    logger.info('Database pool initialized');

    const application = createServer(config);

    application.listen(config.PORT, () => {
      logger.info(`Server listening on port ${config.PORT}`);
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to start server', { message: error.message });
    }
    process.exit(1);
  }
}

main();
