import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { VehicleService } from '../services/vehicle.service.js';
import { validateRequest } from '../middleware/request-validator.js';
import { requireRole } from '../middleware/authorization.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';
import { USER_ROLES, PAGINATION_DEFAULTS, VEHICLE_TYPES } from '../config/constants.js';

const vehicleService = new VehicleService();
const VALID_VEHICLE_TYPES = Object.values(VEHICLE_TYPES);

export const vehicleRoutes = Router();

vehicleRoutes.get(
  '/',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(request.query['page'] as string, 10) || PAGINATION_DEFAULTS.PAGE;
      const pageSize = Math.min(
        parseInt(request.query['pageSize'] as string, 10) || PAGINATION_DEFAULTS.PAGE_SIZE,
        PAGINATION_DEFAULTS.MAX_PAGE_SIZE,
      );
      const sortBy = (request.query['sortBy'] as string) || 'licensePlate';
      const sortOrder = (request.query['sortOrder'] as string) || 'asc';
      const type = request.query['type'] as string | undefined;
      const depotId = request.query['depotId'] as string | undefined;
      const status = request.query['status'] as string | undefined;

      const result = await vehicleService.findAll(
        page, pageSize, sortBy, sortOrder, type, depotId, status,
      );
      sendPaginated(response, result.items, result.total, page, pageSize);
    } catch (error) {
      next(error);
    }
  },
);

vehicleRoutes.get(
  '/:id',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const vehicle = await vehicleService.findById(String(request.params['id']));
      sendSuccess(response, vehicle);
    } catch (error) {
      next(error);
    }
  },
);

vehicleRoutes.post(
  '/',
  requireRole(USER_ROLES.ADMIN),
  [
    body('licensePlate').isString().trim().isLength({ min: 1, max: 20 })
      .withMessage('License plate is required (1-20 characters)'),
    body('type').isIn(VALID_VEHICLE_TYPES)
      .withMessage(`Type must be one of: ${VALID_VEHICLE_TYPES.join(', ')}`),
    body('weightCapacityKg').isFloat({ gt: 0 })
      .withMessage('Weight capacity must be greater than 0'),
    body('volumeCapacityCbm').isFloat({ gt: 0 })
      .withMessage('Volume capacity must be greater than 0'),
    body('currentDepotId').optional().isUUID()
      .withMessage('Current depot ID must be a valid UUID'),
  ],
  validateRequest,
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const vehicle = await vehicleService.create(request.body);
      sendCreated(response, vehicle);
    } catch (error) {
      next(error);
    }
  },
);

vehicleRoutes.put(
  '/:id',
  requireRole(USER_ROLES.ADMIN),
  [
    body('licensePlate').optional().isString().trim().isLength({ min: 1, max: 20 })
      .withMessage('License plate must be 1-20 characters'),
    body('type').optional().isIn(VALID_VEHICLE_TYPES)
      .withMessage(`Type must be one of: ${VALID_VEHICLE_TYPES.join(', ')}`),
    body('weightCapacityKg').optional().isFloat({ gt: 0 })
      .withMessage('Weight capacity must be greater than 0'),
    body('volumeCapacityCbm').optional().isFloat({ gt: 0 })
      .withMessage('Volume capacity must be greater than 0'),
    body('currentDepotId').optional({ nullable: true }).isUUID()
      .withMessage('Current depot ID must be a valid UUID'),
    body('status').optional().isIn(['available', 'in_transit', 'maintenance'])
      .withMessage('Status must be one of: available, in_transit, maintenance'),
  ],
  validateRequest,
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const vehicle = await vehicleService.update(String(request.params['id']), request.body);
      sendSuccess(response, vehicle);
    } catch (error) {
      next(error);
    }
  },
);
