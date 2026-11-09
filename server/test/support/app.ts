import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import { PrismaClient } from '../../src/generated/prisma/client';
import { seed } from '../../prisma/seed-lib';
import { truncateAll } from './database';

export const USERS = {
  one: { email: 'owner.one@example.test', password: 'first-Password-1' },
  two: { email: 'owner.two@example.test', password: 'second-Password-2' },
};

export interface TestContext {
  app: NestExpressApplication;
  prisma: PrismaClient;
  close: () => Promise<void>;
}

/** Boots the real AppModule against the test database (fresh data for every test file). */
export async function createTestApp(env: Record<string, string> = {}): Promise<TestContext> {
  const url = process.env.TEST_DATABASE_URL!;
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: url,
    JWT_ACCESS_SECRET: 'test-secret-test-secret-test-secret-123456',
    CLIENT_ORIGIN: 'http://localhost:3000',
    UPLOAD_DIR: 'test-uploads',
    STORE_GRAPHQL_URL: '',
    STORE_LOGIN: '',
    STORE_PASSWORD: '',
    LOGIN_RATE_LIMIT: '1000',
    ...env,
  });
  await truncateAll(url);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  await seed(
    prisma,
    {
      SEED_USER1_EMAIL: USERS.one.email,
      SEED_USER1_PASSWORD: USERS.one.password,
      SEED_USER2_EMAIL: USERS.two.email,
      SEED_USER2_PASSWORD: USERS.two.password,
    },
    () => undefined,
  );
  // Imported lazily so that configuration reads the variables set above.
  const { AppModule } = await import('../../src/app.module');
  const { configureApp } = await import('../../src/bootstrap');
  const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule, { logger: false }));
  await app.init();
  return {
    app,
    prisma,
    close: async () => {
      await app.close();
      await prisma.$disconnect();
    },
  };
}

export interface GqlResult<T = Record<string, unknown>> {
  data?: T;
  errors?: { message: string; extensions?: Record<string, unknown> }[];
  cookies: string[];
}

export async function gql<T = Record<string, unknown>>(
  app: NestExpressApplication,
  query: string,
  variables: Record<string, unknown> = {},
  opts: { token?: string; cookie?: string } = {},
): Promise<GqlResult<T>> {
  let req = request(app.getHttpServer()).post('/graphql').set('content-type', 'application/json');
  if (opts.token) req = req.set('authorization', `Bearer ${opts.token}`);
  if (opts.cookie) req = req.set('cookie', opts.cookie);
  const res = await req.send({ query, variables });
  const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
  return { ...(res.body as object), cookies: setCookie ?? [] } as GqlResult<T>;
}

export const LOGIN = `mutation($input: LoginInput!) { login(input: $input) { accessToken expiresIn user { id email } } }`;

export async function login(app: NestExpressApplication, user: { email: string; password: string }) {
  const res = await gql<{ login: { accessToken: string; user: { id: string } } }>(app, LOGIN, { input: user });
  if (!res.data?.login) throw new Error(`login failed: ${JSON.stringify(res.errors)}`);
  return { token: res.data.login.accessToken, userId: res.data.login.user.id, cookie: refreshCookie(res.cookies) };
}

/** Extracts "wb_refresh=<value>" from Set-Cookie headers. */
export function refreshCookie(cookies: string[]) {
  const raw = cookies.find((c) => c.startsWith('wb_refresh='));
  return raw ? raw.split(';')[0] : '';
}
