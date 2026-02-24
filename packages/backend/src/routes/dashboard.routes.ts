import { Router, Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service.js';
import { requireRole } from '../middleware/authorization.js';
import { sendSuccess } from '../utils/response.js';
import { USER_ROLES } from '../config/constants.js';

const dashboardService = new DashboardService();

export const dashboardRoutes = Router();

dashboardRoutes.get(
  '/stats',
  requireRole(USER_ROLES.ADMIN),
  async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await dashboardService.getStats();
      sendSuccess(response, stats);
    } catch (error) {
      next(error);
    }
  },
);
