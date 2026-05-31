import type { Config } from '@config/config';
import type { PostgresClient } from '@infras/postgres/client';
import type { RedisClient } from '@infras/redis/client';
import type { SmtpClient } from '@infras/smtp/client';
import { loadTemplate } from '@infras/smtp/template';
import { betterAuth } from 'better-auth';
import { admin, bearer, jwt, openAPI, twoFactor } from 'better-auth/plugins';
import { schema } from './schema/schema';

export type Auth = ReturnType<typeof betterAuth>;

export class BetterAuthService {
  private readonly instance: Auth;

  constructor(
    config: Config,
    postgresClient: PostgresClient,
    redisClient: RedisClient | null,
    smtpClient: SmtpClient | null = null
  ) {
    const isProd = config.app.env === 'production';
    const { session: sessionSchema, ...restSchema } = schema;

    const twoFactorPlugin = config.twoFactor.enabled
      ? twoFactor({
          issuer: config.app.name,
          ...(config.twoFactor.method.includes('otp') && smtpClient
            ? {
                otpOptions: {
                  period: config.twoFactor.otpExpiresIn,
                  async sendOTP({ user, otp }) {
                    const expireIn = `${Math.round(config.twoFactor.otpExpiresIn / 60)} minutes`;
                    try {
                      await smtpClient.sendMail({
                        to: user.email,
                        subject: 'Your verification code',
                        text: `Your verification code is: ${otp}`,
                        html: await loadTemplate('two-factor-otp', {
                          Name: user.name ?? user.email,
                          Otp: otp,
                          ExpireIn: expireIn,
                        }),
                      });
                    } catch {
                      // non-blocking
                    }
                  },
                },
              }
            : {}),
        })
      : null;

    this.instance = betterAuth({
      baseURL: config.auth.baseUrl,
      secret: config.auth.secretKey,
      database: postgresClient.getPool(),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
        resetPasswordTokenExpiresIn: config.auth.resetPasswordExpiresIn,
        sendResetPassword: async ({ user, url }) => {
          if (!smtpClient) return;
          const expireIn = `${Math.round(config.auth.resetPasswordExpiresIn / 60)} minutes`;
          try {
            await smtpClient.sendMail({
              to: user.email,
              subject: 'Reset your password',
              text: `Reset your password: ${url}`,
              html: await loadTemplate('reset-password', {
                Name: user.name ?? user.email,
                ResetUrl: url,
                ExpireIn: expireIn,
              }),
            });
          } catch {
            // non-blocking
          }
        },
      },
      trustedOrigins: config.auth.trustedOrigins,
      advanced: {
        useSecureCookies: isProd,
        cookies: {
          session_token: {
            attributes: {
              httpOnly: true,
              secure: isProd,
              sameSite: 'none',
              path: '/',
            },
          },
          session_data: {
            attributes: {
              secure: isProd,
              sameSite: 'none',
              path: '/',
            },
          },
        },
      },
      session: {
        ...sessionSchema,
        expiresIn: config.session.expiresIn,
        updateAge: config.session.updateAge,
        cookieCache: {
          enabled: !!redisClient,
          maxAge: config.session.cookieCacheMaxAge,
        },
      },
      plugins: [
        openAPI(),
        admin(),
        bearer(),
        jwt({
          jwks: {
            // Private key stored as plain JWK (not AES-encrypted) so the custom
            // /api/auth/token/:product handler can read and sign with it directly
            // via raw SQL + jose, without needing to replicate the decryption path.
            disablePrivateKeyEncryption: true,
          },
          jwt: {
            issuer: config.auth.baseUrl,
            expirationTime: '3h',
            definePayload: ({ user }) => {
              const u = user as typeof user & { role?: string };
              return {
                id: u.id,
                email: u.email,
                role: u.role ?? 'user',
              };
            },
          },
        }),
        ...(twoFactorPlugin ? [twoFactorPlugin] : []),
      ],
      // signup OTP hook — runs independently of AUTH_2FA_ENABLED
      databaseHooks: {
        user: {
          create: {
            after: async (user) => {
              if (!config.twoFactor.emailVerificationOtpEnabled) return;
              if (!config.twoFactor.method.includes('otp')) return;
              if (!smtpClient) return;
              try {
                // TODO: sending a real OTP here requires a session — consider using emailOTP plugin for signup verification
                const expireIn = `${Math.round(config.twoFactor.otpExpiresIn / 60)} minutes`;
                await smtpClient.sendMail({
                  to: user.email,
                  subject: 'Verify your email',
                  text: 'Please verify your email to complete signup.',
                  html: await loadTemplate('email-verification', {
                    Name: user.name ?? user.email,
                    ExpireIn: expireIn,
                  }),
                });
              } catch {
                // non-blocking
              }
            },
          },
        },
      },
      ...(config.oauth.google && {
        socialProviders: {
          google: {
            clientId: config.oauth.google.clientId,
            clientSecret: config.oauth.google.clientSecret,
          },
        },
      }),
      ...restSchema,
    });
  }

  getAuth(): Auth {
    return this.instance;
  }
}
