import { Router, Request, Response, NextFunction } from 'express';
import { RouteRepository } from '../repositories/route.repository.js';
import { PackageRepository } from '../repositories/package.repository.js';
import { DeliveryRepository } from '../repositories/delivery.repository.js';
import { DeliveryService } from '../services/delivery.service.js';
import { RouteService } from '../services/route.service.js';
import { requireRole } from '../middleware/authorization.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';
import { USER_ROLES, PAGINATION_DEFAULTS } from '../config/constants.js';

const routeRepository = new RouteRepository();
const packageRepository = new PackageRepository();
const deliveryRepository = new DeliveryRepository();
const deliveryService = new DeliveryService();
const routeService = new RouteService();

export const driverRoutes = Router();

driverRoutes.use(requireRole(USER_ROLES.DRIVER));

// GET /driver/today-route — returns route with flat packages array (frontend expects this shape)
driverRoutes.get(
  '/today-route',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const todayRoute = await routeRepository.findTodayRouteForDriver(request.user!.userId);
      if (!todayRoute) {
        sendSuccess(response, null);
        return;
      }
      const routeDetails = await routeService.findById(todayRoute.id);

      // Build flat packages array from route_packages
      const packageIds = await routeRepository.getPackageIdsForRoute(todayRoute.id);
      const routePackages = await routeRepository.findPackagesByRouteId(todayRoute.id);
      const packages = [];
      for (const packageId of packageIds) {
        const pkg = await packageRepository.findById(packageId);
        if (pkg) {
          const rp = routePackages.find((r) => r.packageId === packageId);
          packages.push({
            id: pkg.id,
            trackingNumber: pkg.trackingNumber,
            status: pkg.currentStatus,
            originAddress: pkg.originAddress,
            destinationAddress: pkg.destinationAddress,
            weightKg: Number(pkg.weightKg),
            pickupStopId: rp?.pickupStopId ?? null,
            dropoffStopId: rp?.dropoffStopId ?? null,
          });
        }
      }

      sendSuccess(response, {
        id: routeDetails.id,
        vehicleLicensePlate: routeDetails.vehicleLicensePlate,
        scheduledDate: routeDetails.routeDate,
        status: routeDetails.status,
        stops: routeDetails.stops.map((s) => ({
          id: s.id,
          depotName: s.depotName,
          depotAddress: '',
          stopOrder: s.stopOrder,
          arrivedAt: s.actualArrival ?? null,
          departedAt: null,
        })),
        packages,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Keep original endpoint as alias
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

// GET /driver/packages/:id — single package detail
driverRoutes.get(
  '/packages/:id',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const pkg = await packageRepository.findById(String(request.params['id']));
      if (!pkg) {
        sendSuccess(response, null);
        return;
      }

      const todayRoute = await routeRepository.findTodayRouteForDriver(request.user!.userId);
      const routePackages = todayRoute
        ? await routeRepository.findPackagesByRouteId(todayRoute.id)
        : [];
      const rp = routePackages.find((r) => r.packageId === pkg.id);

      sendSuccess(response, {
        id: pkg.id,
        trackingNumber: pkg.trackingNumber,
        status: pkg.currentStatus,
        originAddress: pkg.originAddress,
        destinationAddress: pkg.destinationAddress,
        weightKg: Number(pkg.weightKg),
        pickupStopId: rp?.pickupStopId ?? null,
        dropoffStopId: rp?.dropoffStopId ?? null,
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /driver/packages/:id/deliver — confirm delivery
driverRoutes.post(
  '/packages/:id/deliver',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const packageId = String(request.params['id']);
      const { notes } = request.body as { recipientName?: string; notes?: string };
      const delivery = await deliveryService.create(
        { packageId, note: notes },
        request.user!.userId,
      );
      sendCreated(response, delivery);
    } catch (error) {
      next(error);
    }
  },
);

// GET /driver/packages — list all packages for today's route
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

// GET /driver/deliveries — delivery history
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
