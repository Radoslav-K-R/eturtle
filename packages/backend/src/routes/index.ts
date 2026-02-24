import { Express } from 'express';
import { authRoutes } from './auth.routes.js';
import { logger } from '../utils/logger.js';

export function mountRoutes(application: Express): void {
  application.use('/api/auth', authRoutes);

  logger.info('All routes mounted');
}
