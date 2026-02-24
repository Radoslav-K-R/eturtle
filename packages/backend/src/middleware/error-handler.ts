import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

const HTTP_INTERNAL_ERROR = 500;

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    logger.warn('Operational error', {
      message: error.message,
      statusCode: error.statusCode,
    });
    response.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
    return;
  }

  logger.error('Unhandled error', {
    message: error.message,
    stack: error.stack,
  });

  response.status(HTTP_INTERNAL_ERROR).json({
    success: false,
    error: 'Internal server error',
  });
}
