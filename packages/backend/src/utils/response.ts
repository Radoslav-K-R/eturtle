import { Response } from 'express';

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_INTERNAL_ERROR = 500;

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function sendSuccess<T>(
  response: Response,
  data: T,
  statusCode: number = HTTP_OK,
): void {
  response.status(statusCode).json({ success: true, data });
}

export function sendCreated<T>(response: Response, data: T): void {
  sendSuccess(response, data, HTTP_CREATED);
}

export function sendPaginated<T>(
  response: Response,
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): void {
  sendSuccess(response, { items, total, page, pageSize });
}

export function sendError(
  response: Response,
  message: string,
  statusCode: number = HTTP_BAD_REQUEST,
): void {
  response.status(statusCode).json({ success: false, error: message });
}

export function sendNotFound(response: Response, message: string = 'Resource not found'): void {
  sendError(response, message, HTTP_NOT_FOUND);
}

export function sendUnauthorized(
  response: Response,
  message: string = 'Unauthorized',
): void {
  sendError(response, message, HTTP_UNAUTHORIZED);
}

export function sendForbidden(
  response: Response,
  message: string = 'Forbidden',
): void {
  sendError(response, message, HTTP_FORBIDDEN);
}

export function sendConflict(response: Response, message: string): void {
  sendError(response, message, HTTP_CONFLICT);
}

export function sendInternalError(
  response: Response,
  message: string = 'Internal server error',
): void {
  sendError(response, message, HTTP_INTERNAL_ERROR);
}
