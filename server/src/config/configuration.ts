/**
 * Typed configuration. Every value comes from environment variables (see .env.example).
 * Secrets are never sent to the browser.
 */
const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} is required`);
  return value;
};

const isProduction = process.env.NODE_ENV === 'production';

const secret = (name: string): string => {
  const value = isProduction ? required(name) : process.env[name] || `dev-only-${name.toLowerCase()}`;
  if (isProduction && value.length < 32) throw new Error(`${name} must be at least 32 characters long`);
  return value;
};

export default () => ({
  isProduction,
  port: parseInt(process.env.PORT ?? '4000', 10),
  databaseUrl: required('DATABASE_URL'),
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:3000').split(',').map((s) => s.trim()).filter(Boolean),
  auth: {
    accessSecret: secret('JWT_ACCESS_SECRET'),
    accessTtlSeconds: parseInt(process.env.JWT_ACCESS_TTL_SECONDS ?? '900', 10),
    refreshTtlDays: parseInt(process.env.REFRESH_TTL_DAYS ?? '30', 10),
    // A just-rotated token presented again within this window is a parallel refresh
    // (e.g. two browser tabs), not theft: it is rejected without revoking the family.
    refreshReuseGraceSeconds: parseInt(process.env.REFRESH_REUSE_GRACE_SECONDS ?? '20', 10),
    cookieName: process.env.REFRESH_COOKIE_NAME ?? 'wb_refresh',
    cookieSecure: (process.env.COOKIE_SECURE ?? (isProduction ? 'true' : 'false')) === 'true',
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  },
  uploads: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxBytes: parseInt(process.env.UPLOAD_MAX_BYTES ?? String(5 * 1024 * 1024), 10),
  },
  store: {
    graphqlUrl: process.env.STORE_GRAPHQL_URL ?? '',
    login: process.env.STORE_LOGIN ?? '',
    password: process.env.STORE_PASSWORD ?? '',
    currency: (process.env.STORE_CURRENCY ?? 'UZS') as 'UZS' | 'USD' | 'CNY',
    syncIntervalMinutes: parseInt(process.env.STORE_SYNC_INTERVAL_MINUTES ?? '0', 10),
    pageSize: parseInt(process.env.STORE_PAGE_SIZE ?? '100', 10),
    timeoutMs: parseInt(process.env.STORE_TIMEOUT_MS ?? '20000', 10),
  },
});
