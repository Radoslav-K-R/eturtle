import { Router, Request, Response, NextFunction } from 'express';
import { query } from 'express-validator';
import { GeocodingService } from '../services/geocoding.service.js';
import { validateRequest } from '../middleware/request-validator.js';
import { sendSuccess } from '../utils/response.js';

const geocodingService = new GeocodingService();

export const geocodingRoutes = Router();

geocodingRoutes.get(
  '/cities',
  [
    query('q').isString().trim().isLength({ min: 2, max: 255 })
      .withMessage('Search query must be 2-255 characters'),
    query('country').optional().isString().trim().isLength({ min: 2, max: 2 })
      .withMessage('Country code must be 2 characters (ISO 3166-1 alpha-2)'),
  ],
  validateRequest,
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const q = request.query['q'] as string;
      const country = request.query['country'] as string | undefined;
      const results = await geocodingService.searchCities(q, country);
      sendSuccess(response, results);
    } catch (error) {
      next(error);
    }
  },
);

geocodingRoutes.get(
  '/address',
  [
    query('q').isString().trim().isLength({ min: 2, max: 500 })
      .withMessage('Address query must be 2-500 characters'),
    query('city').optional().isString().trim().isLength({ min: 1, max: 255 })
      .withMessage('City must be 1-255 characters'),
  ],
  validateRequest,
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const q = request.query['q'] as string;
      const city = request.query['city'] as string | undefined;
      const results = await geocodingService.geocodeAddress(q, city);
      sendSuccess(response, results);
    } catch (error) {
      next(error);
    }
  },
);
