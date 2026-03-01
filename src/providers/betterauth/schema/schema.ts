/**
 * schema defines the database schema for better-auth. It is used to generate the SQL migration file and to configure better-auth.
 * You can customize the schema according to your needs, but make sure to keep the required fields and their types.
 * For more details, refer to the better-auth documentation: https://docs.better-auth.com/configuration/schema
 */

import { defaultSchema } from "./default";

type UserFields = {
  id: string;
  name: string;
  email: string;
  emailVerified: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
};

type SessionFields = {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
};

type AccountFields = {
  id: string;
  userId: string;
  accountId: string;
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  scope?: string;
  password?: string;
  createdAt: string;
  updatedAt: string;
};

type VerificationFields = {
  id: string;
  identifier: string;
  value: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

type SchemaOverride = {
  user?: { modelName?: string; fields?: Partial<UserFields> };
  session?: { modelName?: string; fields?: Partial<SessionFields> };
  account?: { modelName?: string; fields?: Partial<AccountFields> };
  verification?: { modelName?: string; fields?: Partial<VerificationFields> };
};

export function createSchema(overrides?: SchemaOverride) {
  if (!overrides) return defaultSchema;

  return {
    user: {
      ...defaultSchema.user,
      ...overrides.user,
      fields: { ...defaultSchema.user.fields, ...overrides.user?.fields },
    },
    session: {
      ...defaultSchema.session,
      ...overrides.session,
      fields: { ...defaultSchema.session.fields, ...overrides.session?.fields },
    },
    account: {
      ...defaultSchema.account,
      ...overrides.account,
      fields: { ...defaultSchema.account.fields, ...overrides.account?.fields },
    },
    verification: {
      ...defaultSchema.verification,
      ...overrides.verification,
      fields: { ...defaultSchema.verification.fields, ...overrides.verification?.fields },
    },
  };
}

export const schema = createSchema();
