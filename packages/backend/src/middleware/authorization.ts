import { Request, Response, NextFunction } from 'express';
import { sendForbidden, sendUnauthorized } from '../utils/response.js';

export function requireRole(...allowedRoles: string[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.user) {
      sendUnauthorized(response);
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      sendForbidden(response, 'Insufficient permissions for this action');
      return;
    }

    next();
  };
}
