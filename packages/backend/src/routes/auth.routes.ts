import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { AuthService } from '../services/auth.service.js';
import { validateRequest } from '../middleware/request-validator.js';
import { sendSuccess } from '../utils/response.js';
import { validateEnvironment } from '../config/environment.js';

const config = validateEnvironment();
const authService = new AuthService(config.JWT_SECRET, config.JWT_EXPIRATION);

export const authRoutes = Router();

authRoutes.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = request.body as { email: string; password: string };
      const result = await authService.login(email, password);
      sendSuccess(response, result);
    } catch (error) {
      next(error);
    }
  },
);

authRoutes.get(
  '/me',
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await authService.getProfile(request.user!.userId);
      sendSuccess(response, profile);
    } catch (error) {
      next(error);
    }
  },
);
