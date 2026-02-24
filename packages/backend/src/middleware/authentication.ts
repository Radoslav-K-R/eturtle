import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendUnauthorized } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const BEARER_PREFIX = 'Bearer ';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticationMiddleware(jwtSecret: string) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith(BEARER_PREFIX)) {
      sendUnauthorized(response, 'Missing or invalid authorization header');
      return;
    }

    const token = authorizationHeader.slice(BEARER_PREFIX.length);

    try {
      const decoded = jwt.verify(token, jwtSecret) as AuthenticatedUser;
      request.user = decoded;
      next();
    } catch {
      logger.debug('JWT verification failed');
      sendUnauthorized(response, 'Invalid or expired token');
    }
  };
}
