interface JWTConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiry: string;
  refreshExpiry: string;
}

interface BcryptConfig {
  saltRounds: number;
}

interface EmailConfig {
  apiKey: string;
  from: string;
}

interface AppConfig {
  port: number;
  env: string;
  corsOrigin: string;
  frontendUrl: string;
  name: string;
}

interface SecurityConfig {
  maxLoginAttempts: number;
  lockTime: number;
  otpExpiry: number;
  passwordResetExpiry: number;
  maxRefreshTokens: number;
}

export interface Config {
  jwt: JWTConfig;
  bcrypt: BcryptConfig;
  email: EmailConfig;
  app: AppConfig;
  security: SecurityConfig;
}

const config: Config = {
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  bcrypt: {
    saltRounds: 12,
  },
  email: {
    apiKey: process.env.EMAIL_API_KEY || '',
    from: process.env.EMAIL_FROM || '',
  },
  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    name: 'Movie Club',
  },
  security: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000, // 15 minutes
    otpExpiry: 24 * 60 * 60 * 1000, // 24 hours
    passwordResetExpiry: 60 * 60 * 1000, // 1 hour
    maxRefreshTokens: 5,
  },
};

export default config;