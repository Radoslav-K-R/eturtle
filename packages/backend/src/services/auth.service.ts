import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository.js';
import { comparePassword } from '../utils/password.js';
import { AppError } from '../middleware/error-handler.js';
import { logger } from '../utils/logger.js';

const HTTP_UNAUTHORIZED = 401;

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

export class AuthService {
  private readonly userRepository: UserRepository;
  private readonly jwtSecret: string;
  private readonly jwtExpiration: string;

  constructor(jwtSecret: string, jwtExpiration: string) {
    this.userRepository = new UserRepository();
    this.jwtSecret = jwtSecret;
    this.jwtExpiration = jwtExpiration;
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(email);

    if (!user || !user.isActive) {
      throw new AppError('Invalid email or password', HTTP_UNAUTHORIZED);
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', HTTP_UNAUTHORIZED);
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, this.jwtSecret, {
      expiresIn: this.jwtExpiration as string & jwt.SignOptions['expiresIn'],
    } as jwt.SignOptions);

    logger.info('User logged in', { userId: user.id, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string): Promise<{
    id: string;
    email: string;
    fullName: string;
    role: string;
    vehicleId: string | null;
  }> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', HTTP_UNAUTHORIZED);
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      vehicleId: user.vehicleId,
    };
  }
}
