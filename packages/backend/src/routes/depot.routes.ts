import { Router, Request, Response, NextFunction } from 'express';
import { body, query } from 'express-validator';
import { DepotService } from '../services/depot.service.js';
import { validateRequest } from '../middleware/request-validator.js';
import { requireRole } from '../middleware/authorization.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';
import { USER_ROLES, PAGINATION_DEFAULTS, DEPOT_TYPES } from '../config/constants.js';

const depotService = new DepotService();

export const depotRoutes = Router();

depotRoutes.get(
  '/nearest',
  [
    query('latitude').isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    query('longitude').isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    query('type').optional().isIn([DEPOT_TYPES.DEPOT, DEPOT_TYPES.HUB])
      .withMessage('Type must be "depot" or "hub"'),
    query('limit').optional().isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
  ],
  validateRequest,
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const latitude = parseFloat(request.query['latitude'] as string);
      const longitude = parseFloat(request.query['longitude'] as string);
      const type = request.query['type'] as 'depot' | 'hub' | undefined;
      const limit = request.query['limit']
        ? parseInt(request.query['limit'] as string, 10)
        : 5;

      const results = await depotService.findNearest(latitude, longitude, type, limit);
      sendSuccess(response, results);
    } catch (error) {
      next(error);
    }
  },
);

depotRoutes.get(
  '/',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(request.query['page'] as string, 10) || PAGINATION_DEFAULTS.PAGE;
      const pageSize = Math.min(
        parseInt(request.query['pageSize'] as string, 10) || PAGINATION_DEFAULTS.PAGE_SIZE,
        PAGINATION_DEFAULTS.MAX_PAGE_SIZE,
      );
      const sortBy = (request.query['sortBy'] as string) || 'name';
      const sortOrder = (request.query['sortOrder'] as string) || 'asc';
      const isActive = request.query['isActive'] !== undefined
        ? request.query['isActive'] === 'true'
        : undefined;
      const type = request.query['type'] as 'depot' | 'hub' | undefined;

      const result = await depotService.findAll(page, pageSize, sortBy, sortOrder, isActive, type);
      sendPaginated(response, result.items, result.total, page, pageSize);
    } catch (error) {
      next(error);
    }
  },
);

depotRoutes.get(
  '/:id',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const depot = await depotService.findById(String(request.params['id']));
      sendSuccess(response, depot);
    } catch (error) {
      next(error);
    }
  },
);

depotRoutes.post(
  '/',
  requireRole(USER_ROLES.ADMIN),
  [
    body('name').isString().trim().isLength({ min: 1, max: 255 })
      .withMessage('Name is required (1-255 characters)'),
    body('address').isString().trim().isLength({ min: 1, max: 500 })
      .withMessage('Address is required (1-500 characters)'),
    body('latitude').isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('longitude').isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    body('type').optional().isIn([DEPOT_TYPES.DEPOT, DEPOT_TYPES.HUB])
      .withMessage('Type must be "depot" or "hub"'),
    body('city').optional().isString().trim().isLength({ min: 1, max: 255 })
      .withMessage('City must be 1-255 characters'),
  ],
  validateRequest,
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const depot = await depotService.create(request.body);
      sendCreated(response, depot);
    } catch (error) {
      next(error);
    }
  },
);

depotRoutes.put(
  '/:id',
  requireRole(USER_ROLES.ADMIN),
  [
    body('name').optional().isString().trim().isLength({ min: 1, max: 255 })
      .withMessage('Name must be 1-255 characters'),
    body('address').optional().isString().trim().isLength({ min: 1, max: 500 })
      .withMessage('Address must be 1-500 characters'),
    body('latitude').optional().isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('longitude').optional().isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    body('isActive').optional().isBoolean()
      .withMessage('isActive must be a boolean'),
    body('type').optional().isIn([DEPOT_TYPES.DEPOT, DEPOT_TYPES.HUB])
      .withMessage('Type must be "depot" or "hub"'),
    body('city').optional().isString().trim().isLength({ min: 1, max: 255 })
      .withMessage('City must be 1-255 characters'),
  ],
  validateRequest,
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const depot = await depotService.update(String(request.params['id']), request.body);
      sendSuccess(response, depot);
    } catch (error) {
      next(error);
    }
  },
);
