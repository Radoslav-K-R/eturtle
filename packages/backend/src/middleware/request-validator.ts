import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/response.js';

const HTTP_UNPROCESSABLE = 422;

export function validateRequest(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const errors = validationResult(request);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => {
      if ('path' in error) {
        return `${error.path}: ${error.msg}`;
      }
      return String(error.msg);
    });

    sendError(
      response,
      errorMessages.join('; '),
      HTTP_UNPROCESSABLE,
    );
    return;
  }

  next();
}
