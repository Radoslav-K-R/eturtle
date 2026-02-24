import { Router, Request, Response, NextFunction } from 'express';
import { RouteRepository } from '../repositories/route.repository.js';
import { PackageRepository } from '../repositories/package.repository.js';
import { DeliveryRepository } from '../repositories/delivery.repository.js';
import { RouteService } from '../services/route.service.js';
import { requireRole } from '../middleware/authorization.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { USER_ROLES, PAGINATION_DEFAULTS } from '../config/constants.js';

const routeRepository = new RouteRepository();
const packageRepository = new PackageRepository();
const deliveryRepository = new DeliveryRepository();
const routeService = new RouteService();

export const driverRoutes = Router();

driverRoutes.use(requireRole(USER_ROLES.DRIVER));

driverRoutes.get(
  '/routes/today',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const todayRoute = await routeRepository.findTodayRouteForDriver(request.user!.userId);
      if (!todayRoute) {
        sendSuccess(response, null);
        return;
      }
      const routeDetails = await routeService.findById(todayRoute.id);
      sendSuccess(response, routeDetails);
    } catch (error) {
      next(error);
    }
  },
);

driverRoutes.get(
  '/packages',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const todayRoute = await routeRepository.findTodayRouteForDriver(request.user!.userId);
      if (!todayRoute) {
        sendPaginated(response, [], 0, 1, PAGINATION_DEFAULTS.PAGE_SIZE);
        return;
      }
      const packageIds = await routeRepository.getPackageIdsForRoute(todayRoute.id);
      const packages = [];
      for (const packageId of packageIds) {
        const pkg = await packageRepository.findById(packageId);
        if (pkg) {
          packages.push(pkg);
        }
      }
      const statusFilter = request.query['status'] as string | undefined;
      const filtered = statusFilter
        ? packages.filter((p) => p.currentStatus === statusFilter)
        : packages;
      sendPaginated(response, filtered, filtered.length, 1, filtered.length || PAGINATION_DEFAULTS.PAGE_SIZE);
    } catch (error) {
      next(error);
    }
  },
);

driverRoutes.get(
  '/deliveries',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(request.query['page'] as string, 10) || PAGINATION_DEFAULTS.PAGE;
      const pageSize = Math.min(
        parseInt(request.query['pageSize'] as string, 10) || PAGINATION_DEFAULTS.PAGE_SIZE,
        PAGINATION_DEFAULTS.MAX_PAGE_SIZE,
      );
      const sortBy = (request.query['sortBy'] as string) || 'deliveredAt';
      const sortOrder = (request.query['sortOrder'] as string) || 'desc';

      const result = await deliveryRepository.findAll(
        page, pageSize, sortBy, sortOrder, request.user!.userId,
      );
      sendPaginated(response, result.items, result.total, page, pageSize);
    } catch (error) {
      next(error);
    }
  },
);
