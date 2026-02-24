import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { RouteService } from '../services/route.service.js';
import { validateRequest } from '../middleware/request-validator.js';
import { requireRole } from '../middleware/authorization.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { USER_ROLES, PAGINATION_DEFAULTS } from '../config/constants.js';

const routeService = new RouteService();

export const routeRoutes = Router();

routeRoutes.get(
  '/',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(request.query['page'] as string, 10) || PAGINATION_DEFAULTS.PAGE;
      const pageSize = Math.min(
        parseInt(request.query['pageSize'] as string, 10) || PAGINATION_DEFAULTS.PAGE_SIZE,
        PAGINATION_DEFAULTS.MAX_PAGE_SIZE,
      );
      const sortBy = (request.query['sortBy'] as string) || 'routeDate';
      const sortOrder = (request.query['sortOrder'] as string) || 'desc';
      const status = request.query['status'] as string | undefined;
      const driverId = request.query['driverId'] as string | undefined;
      const dateFrom = request.query['dateFrom'] as string | undefined;
      const dateTo = request.query['dateTo'] as string | undefined;

      const result = await routeService.findAll(
        page, pageSize, sortBy, sortOrder, status, driverId, dateFrom, dateTo,
      );
      sendPaginated(response, result.items, result.total, page, pageSize);
    } catch (error) {
      next(error);
    }
  },
);

routeRoutes.get(
  '/:id',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const route = await routeService.findById(String(request.params['id']));
      sendSuccess(response, route);
    } catch (error) {
      next(error);
    }
  },
);

routeRoutes.post(
  '/:id/approve',
  requireRole(USER_ROLES.ADMIN),
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const route = await routeService.approve(String(request.params['id']), request.user!.userId);
      sendSuccess(response, route);
    } catch (error) {
      next(error);
    }
  },
);

routeRoutes.post(
  '/:id/reject',
  requireRole(USER_ROLES.ADMIN),
  [
    body('reason').optional().isString().isLength({ max: 500 })
      .withMessage('Reason must be at most 500 characters'),
  ],
  validateRequest,
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const { reason } = request.body as { reason?: string };
      const route = await routeService.reject(String(request.params['id']), reason);
      sendSuccess(response, route);
    } catch (error) {
      next(error);
    }
  },
);
