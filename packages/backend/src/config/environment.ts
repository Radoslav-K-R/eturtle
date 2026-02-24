import Joi from 'joi';

const DEFAULT_PORT = 3000;
const DEFAULT_BCRYPT_COST_FACTOR = 12;
const DEFAULT_JWT_EXPIRATION = '24h';

const environmentSchema = Joi.object({
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required()
    .messages({ 'any.required': 'DATABASE_URL is required (PostgreSQL connection string)' }),
  JWT_SECRET: Joi.string().min(16).required()
    .messages({ 'any.required': 'JWT_SECRET is required (minimum 16 characters)' }),
  JWT_EXPIRATION: Joi.string().default(DEFAULT_JWT_EXPIRATION),
  PORT: Joi.number().port().default(DEFAULT_PORT),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  BCRYPT_COST_FACTOR: Joi.number().min(DEFAULT_BCRYPT_COST_FACTOR).default(DEFAULT_BCRYPT_COST_FACTOR),
}).unknown(true);

export interface EnvironmentConfig {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRATION: string;
  PORT: number;
  NODE_ENV: string;
  BCRYPT_COST_FACTOR: number;
}

export function validateEnvironment(): EnvironmentConfig {
  const { error, value } = environmentSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    const messages = error.details.map((detail) => `  - ${detail.message}`).join('\n');
    throw new Error(`Environment validation failed:\n${messages}`);
  }

  return value as EnvironmentConfig;
}
