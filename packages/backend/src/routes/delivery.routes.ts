import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { DeliveryService } from '../services/delivery.service.js';
import { validateRequest } from '../middleware/request-validator.js';
import { requireRole } from '../middleware/authorization.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';
import { USER_ROLES, PAGINATION_DEFAULTS } from '../config/constants.js';

const deliveryService = new DeliveryService();

export const deliveryRoutes = Router();

deliveryRoutes.get(
  '/',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(request.query['page'] as string, 10) || PAGINATION_DEFAULTS.PAGE;
      const pageSize = Math.min(
        parseInt(request.query['pageSize'] as string, 10) || PAGINATION_DEFAULTS.PAGE_SIZE,
        PAGINATION_DEFAULTS.MAX_PAGE_SIZE,
      );
      const sortBy = (request.query['sortBy'] as string) || 'deliveredAt';
      const sortOrder = (request.query['sortOrder'] as string) || 'desc';
      const driverId = request.query['driverId'] as string | undefined;
      const dateFrom = request.query['dateFrom'] as string | undefined;
      const dateTo = request.query['dateTo'] as string | undefined;

      const result = await deliveryService.findAll(
        page, pageSize, sortBy, sortOrder, driverId, dateFrom, dateTo,
      );
      sendPaginated(response, result.items, result.total, page, pageSize);
    } catch (error) {
      next(error);
    }
  },
);

deliveryRoutes.get(
  '/:id',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const delivery = await deliveryService.findById(String(request.params['id']));
      sendSuccess(response, delivery);
    } catch (error) {
      next(error);
    }
  },
);

deliveryRoutes.post(
  '/',
  requireRole(USER_ROLES.DRIVER),
  [
    body('packageId').isUUID().withMessage('Package ID must be a valid UUID'),
    body('note').optional().isString().isLength({ max: 1000 })
      .withMessage('Note must be at most 1000 characters'),
  ],
  validateRequest,
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const delivery = await deliveryService.create(request.body, request.user!.userId);
      sendCreated(response, delivery);
    } catch (error) {
      next(error);
    }
  },
);
