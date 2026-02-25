import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { PackageService } from '../services/package.service.js';
import { validateRequest } from '../middleware/request-validator.js';
import { requireRole } from '../middleware/authorization.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';
import { USER_ROLES, PAGINATION_DEFAULTS } from '../config/constants.js';

const packageService = new PackageService();

export const packageRoutes = Router();

packageRoutes.get(
  '/',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(request.query['page'] as string, 10) || PAGINATION_DEFAULTS.PAGE;
      const pageSize = Math.min(
        parseInt(request.query['pageSize'] as string, 10) || PAGINATION_DEFAULTS.PAGE_SIZE,
        PAGINATION_DEFAULTS.MAX_PAGE_SIZE,
      );
      const sortBy = (request.query['sortBy'] as string) || 'createdAt';
      const sortOrder = (request.query['sortOrder'] as string) || 'desc';
      const status = request.query['status'] as string | undefined;
      const originDepotId = request.query['originDepotId'] as string | undefined;
      const destinationDepotId = request.query['destinationDepotId'] as string | undefined;

      const result = await packageService.findAll(
        page, pageSize, sortBy, sortOrder, status, originDepotId, destinationDepotId,
      );
      sendPaginated(response, result.items, result.total, page, pageSize);
    } catch (error) {
      next(error);
    }
  },
);

packageRoutes.get(
  '/:id',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const pkg = await packageService.findById(String(request.params['id']));
      sendSuccess(response, pkg);
    } catch (error) {
      next(error);
    }
  },
);

packageRoutes.post(
  '/',
  requireRole(USER_ROLES.ADMIN),
  [
    body('originAddress').isString().trim().isLength({ min: 1, max: 500 })
      .withMessage('Origin address is required (1-500 characters)'),
    body('destinationAddress').isString().trim().isLength({ min: 1, max: 500 })
      .withMessage('Destination address is required (1-500 characters)'),
    body('weightKg').isFloat({ gt: 0 })
      .withMessage('Weight must be greater than 0'),
    body('lengthCm').isFloat({ gt: 0 })
      .withMessage('Length must be greater than 0'),
    body('widthCm').isFloat({ gt: 0 })
      .withMessage('Width must be greater than 0'),
    body('heightCm').isFloat({ gt: 0 })
      .withMessage('Height must be greater than 0'),
    body('contentsDescription').optional().isString().isLength({ max: 2000 })
      .withMessage('Contents description must be at most 2000 characters'),
    body('originLatitude').optional().isFloat({ min: -90, max: 90 })
      .withMessage('Origin latitude must be between -90 and 90'),
    body('originLongitude').optional().isFloat({ min: -180, max: 180 })
      .withMessage('Origin longitude must be between -180 and 180'),
    body('destinationLatitude').optional().isFloat({ min: -90, max: 90 })
      .withMessage('Destination latitude must be between -90 and 90'),
    body('destinationLongitude').optional().isFloat({ min: -180, max: 180 })
      .withMessage('Destination longitude must be between -180 and 180'),
  ],
  validateRequest,
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const pkg = await packageService.create(request.body, request.user?.userId ?? null);
      sendCreated(response, pkg);
    } catch (error) {
      next(error);
    }
  },
);

packageRoutes.put(
  '/:id',
  requireRole(USER_ROLES.ADMIN),
  [
    body('originAddress').optional().isString().trim().isLength({ min: 1, max: 500 })
      .withMessage('Origin address must be 1-500 characters'),
    body('destinationAddress').optional().isString().trim().isLength({ min: 1, max: 500 })
      .withMessage('Destination address must be 1-500 characters'),
    body('weightKg').optional().isFloat({ gt: 0 })
      .withMessage('Weight must be greater than 0'),
    body('lengthCm').optional().isFloat({ gt: 0 })
      .withMessage('Length must be greater than 0'),
    body('widthCm').optional().isFloat({ gt: 0 })
      .withMessage('Width must be greater than 0'),
    body('heightCm').optional().isFloat({ gt: 0 })
      .withMessage('Height must be greater than 0'),
    body('contentsDescription').optional().isString().isLength({ max: 2000 })
      .withMessage('Contents description must be at most 2000 characters'),
    body('originLatitude').optional().isFloat({ min: -90, max: 90 })
      .withMessage('Origin latitude must be between -90 and 90'),
    body('originLongitude').optional().isFloat({ min: -180, max: 180 })
      .withMessage('Origin longitude must be between -180 and 180'),
    body('destinationLatitude').optional().isFloat({ min: -90, max: 90 })
      .withMessage('Destination latitude must be between -90 and 90'),
    body('destinationLongitude').optional().isFloat({ min: -180, max: 180 })
      .withMessage('Destination longitude must be between -180 and 180'),
  ],
  validateRequest,
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const pkg = await packageService.update(String(request.params['id']), request.body);
      sendSuccess(response, pkg);
    } catch (error) {
      next(error);
    }
  },
);
