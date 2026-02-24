import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { UserService } from '../services/user.service.js';
import { validateRequest } from '../middleware/request-validator.js';
import { requireRole } from '../middleware/authorization.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';
import { USER_ROLES, PAGINATION_DEFAULTS } from '../config/constants.js';
import { validateEnvironment } from '../config/environment.js';

const MIN_PASSWORD_LENGTH = 8;
const config = validateEnvironment();
const userService = new UserService(config.BCRYPT_COST_FACTOR);

export const userRoutes = Router();

userRoutes.get(
  '/',
  requireRole(USER_ROLES.ADMIN),
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(request.query['page'] as string, 10) || PAGINATION_DEFAULTS.PAGE;
      const pageSize = Math.min(
        parseInt(request.query['pageSize'] as string, 10) || PAGINATION_DEFAULTS.PAGE_SIZE,
        PAGINATION_DEFAULTS.MAX_PAGE_SIZE,
      );
      const sortBy = (request.query['sortBy'] as string) || 'fullName';
      const sortOrder = (request.query['sortOrder'] as string) || 'asc';
      const role = request.query['role'] as string | undefined;
      const isActive = request.query['isActive'] !== undefined
        ? request.query['isActive'] === 'true'
        : undefined;

      const result = await userService.findAll(page, pageSize, sortBy, sortOrder, role, isActive);
      sendPaginated(response, result.items, result.total, page, pageSize);
    } catch (error) {
      next(error);
    }
  },
);

userRoutes.get(
  '/:id',
  requireRole(USER_ROLES.ADMIN),
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await userService.findById(String(request.params['id']));
      sendSuccess(response, user);
    } catch (error) {
      next(error);
    }
  },
);

userRoutes.post(
  '/',
  requireRole(USER_ROLES.ADMIN),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isString().isLength({ min: MIN_PASSWORD_LENGTH })
      .withMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
    body('fullName').isString().trim().isLength({ min: 1, max: 255 })
      .withMessage('Full name is required (1-255 characters)'),
    body('role').isIn(Object.values(USER_ROLES))
      .withMessage(`Role must be one of: ${Object.values(USER_ROLES).join(', ')}`),
    body('vehicleId').optional().isUUID()
      .withMessage('Vehicle ID must be a valid UUID'),
  ],
  validateRequest,
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await userService.create(request.body);
      sendCreated(response, user);
    } catch (error) {
      next(error);
    }
  },
);

userRoutes.put(
  '/:id',
  requireRole(USER_ROLES.ADMIN),
  [
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('password').optional().isString().isLength({ min: MIN_PASSWORD_LENGTH })
      .withMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
    body('fullName').optional().isString().trim().isLength({ min: 1, max: 255 })
      .withMessage('Full name must be 1-255 characters'),
    body('role').optional().isIn(Object.values(USER_ROLES))
      .withMessage(`Role must be one of: ${Object.values(USER_ROLES).join(', ')}`),
    body('vehicleId').optional({ nullable: true }).isUUID()
      .withMessage('Vehicle ID must be a valid UUID'),
    body('isActive').optional().isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  validateRequest,
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await userService.update(String(request.params['id']), request.body);
      sendSuccess(response, user);
    } catch (error) {
      next(error);
    }
  },
);
