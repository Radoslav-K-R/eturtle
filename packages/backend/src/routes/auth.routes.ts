import { Router } from 'express';
import { sendSuccess } from '../utils/response.js';

export const authRoutes = Router();

authRoutes.post('/login', (_request, response) => {
  sendSuccess(response, { message: 'Auth endpoint placeholder' });
});
