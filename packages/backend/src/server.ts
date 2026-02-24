import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler.js';
import { authenticationMiddleware } from './middleware/authentication.js';
import { mountRoutes } from './routes/index.js';
import { logger } from './utils/logger.js';
import { EnvironmentConfig } from './config/environment.js';

export function createServer(config: EnvironmentConfig): Express {
  const application = express();

  application.use(helmet());
  application.use(cors());
  application.use(express.json());

  application.get('/api/health', (_request, response) => {
    response.json({ success: true, data: { status: 'healthy' } });
  });

  const publicPaths = ['/api/health', '/api/auth/login'];

  application.use((request, response, next) => {
    const isPublicPath = publicPaths.some(
      (path) => request.path === path,
    );
    if (isPublicPath) {
      next();
      return;
    }
    authenticationMiddleware(config.JWT_SECRET)(request, response, next);
  });

  mountRoutes(application);

  application.use(errorHandler);

  logger.info('Express application configured');

  return application;
}
