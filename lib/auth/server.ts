import 'server-only';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { hash, verify } from '@node-rs/argon2';
import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'dotenv';
import { getDb } from '@/lib/db/prisma';
import { headers } from 'next/headers';
import { PublicError } from '@/lib/http';
import { applicationUrl } from '@/lib/site-url';
import {
  nameSchema,
  phoneSchema,
  emailSchema,
} from '@/lib/validation/customer';
const local = existsSync('.env.auth') ? parse(readFileSync('.env.auth')) : {};
const secret = process.env.BETTER_AUTH_SECRET || local.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32)
  throw new Error('Authentication secret configuration is required.');
const configured = process.env.AUTH_BASE_URL
  ? applicationUrl(process.env.AUTH_BASE_URL)
  : process.env.NODE_ENV === 'production'
    ? applicationUrl()
    : undefined;
if (
  configured &&
  !['localhost', '127.0.0.1'].includes(new URL(configured).hostname) &&
  !['x-aurelia-proxy-ip', 'cf-connecting-ip', 'x-real-ip'].includes(
    process.env.AUTH_TRUSTED_IP_HEADER || '',
  )
)
  throw new Error(
    'Configure an ingress-overwritten AUTH_TRUSTED_IP_HEADER for public authentication.',
  );
if (
  configured &&
  new URL(configured).protocol !== 'https:' &&
  !['localhost', '127.0.0.1'].includes(new URL(configured).hostname)
)
  throw new Error('Public authentication requires HTTPS.');
export const auth = betterAuth({
  appName: 'Aurelia Estates',
  secret,
  baseURL: configured || {
    allowedHosts: [
      'localhost:3000',
      'localhost:3001',
      '127.0.0.1:3000',
      '127.0.0.1:3001',
    ],
    protocol: 'http',
  },
  trustedOrigins: configured
    ? [configured]
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ],
  database: prismaAdapter(getDb(), {
    provider: 'postgresql',
    transaction: true,
  }),
  logger: { disabled: true },
  user: {
    modelName: 'customer',
    additionalFields: {
      phone: { type: 'string', required: true },
      termsAcceptedAt: {
        type: 'date',
        required: false,
        input: false,
        returned: false,
      },
    },
  },
  session: {
    modelName: 'authSession',
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  account: { modelName: 'authAccount', accountLinking: { enabled: false } },
  verification: { modelName: 'authVerification' },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    password: {
      hash: (password) =>
        hash(password, {
          algorithm: 2,
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        }),
      verify: ({ hash: encoded, password }) => verify(encoded, password),
    },
  },
  advanced: {
    database: { generateId: () => randomUUID() },
    cookiePrefix: 'aurelia',
    useSecureCookies: configured
      ? new URL(configured).protocol === 'https:'
      : false,
    defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' },
    ipAddress: { ipAddressHeaders: ['x-aurelia-client'] },
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    modelName: 'authRateLimit',
    window: 60,
    max: 60,
    customRules: {
      '/sign-in/email': { window: 60, max: 10 },
      '/sign-up/email': { window: 60, max: 5 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: {
            ...user,
            name: nameSchema.parse(user.name),
            email: emailSchema.parse(user.email),
            phone: phoneSchema.parse(
              (user as unknown as { phone: string }).phone,
            ),
            termsAcceptedAt: new Date(),
          },
        }),
      },
    },
  },
});
export async function currentCustomer(incoming?: Headers) {
  const h = incoming || (await headers());
  const result = await auth.api.getSession({ headers: h });
  if (!result) return null;
  return getDb().customer.findFirst({
    where: { id: result.user.id, deletedAt: null },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });
}
export async function requireCustomer(incoming?: Headers) {
  const customer = await currentCustomer(incoming);
  if (!customer) throw new PublicError('Please sign in to continue.', 401);
  return customer;
}

export async function contactCustomer(incoming: Headers) {
  const customer = await currentCustomer(incoming);
  if (
    !customer &&
    /(?:__Secure-)?aurelia\.session_token=/.test(incoming.get('cookie') || '')
  )
    throw new PublicError(
      'Your session has expired. Sign in again before submitting.',
      401,
    );
  return customer;
}
