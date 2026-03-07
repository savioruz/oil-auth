export const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User',
};

export const testUser2 = {
  email: 'test2@example.com',
  password: 'TestPassword456!',
  name: 'Test User 2',
};

export const invalidEmails = [
  'notanemail',
  'missing@domain',
  '@nodomain.com',
  'spaces in@email.com',
];

export const weakPasswords = [
  'short',
  '12345678',
  'alllowercase',
  'ALLUPPERCASE',
  'NoNumbers',
  'n0symb0ls',
];

export function generateRandomEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

export function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function getTestEnv(): Record<string, string> {
  return {
    APP_ENV: 'test',
    APP_PORT: '3001',
    APP_CORS_ENABLE: 'true',
    APP_CORS_ALLOW_CREDENTIALS: 'true',
    APP_CORS_ALLOWED_ORIGINS: 'http://localhost:3001',
    DB_POSTGRES_HOST: 'localhost',
    DB_POSTGRES_PORT: '5432',
    DB_POSTGRES_NAME: 'oil_auth',
    DB_POSTGRES_USER: 'postgres',
    DB_POSTGRES_PASSWORD: 'postgres',
    DB_POSTGRES_SSL_MODE: 'disable',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    OTEL_ENABLED: 'false',
    LOG_LEVEL: 'error',
    AUTH_BASE_URL: 'http://localhost:3001',
    AUTH_SECRET_KEY: 'loremipsumdolorsitametconsecteturadipiscingelit',
    AUTH_REQUIRE_EMAIL_VERIFICATION: 'false',
    AUTH_TRUSTED_ORIGINS: 'http://localhost:3001',
  };
}
