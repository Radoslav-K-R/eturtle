import { Express } from 'express';
import { authRoutes } from './auth.routes.js';
import { dashboardRoutes } from './dashboard.routes.js';
import { depotRoutes } from './depot.routes.js';
import { vehicleRoutes } from './vehicle.routes.js';
import { userRoutes } from './user.routes.js';
import { packageRoutes } from './package.routes.js';
import { routeRoutes } from './route.routes.js';
import { deliveryRoutes } from './delivery.routes.js';
import { driverRoutes } from './driver.routes.js';
import { logger } from '../utils/logger.js';

export function mountRoutes(application: Express): void {
  application.use('/api/auth', authRoutes);
  application.use('/api/dashboard', dashboardRoutes);
  application.use('/api/depots', depotRoutes);
  application.use('/api/vehicles', vehicleRoutes);
  application.use('/api/users', userRoutes);
  application.use('/api/packages', packageRoutes);
  application.use('/api/routes', routeRoutes);
  application.use('/api/deliveries', deliveryRoutes);
  application.use('/api/driver', driverRoutes);

  logger.info('All routes mounted');
}
