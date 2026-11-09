import { tmpdir } from 'os';
import { join } from 'path';
import { resetDatabase } from './database';

/**
 * Uses TEST_DATABASE_URL when it is set (e.g. the docker compose PostgreSQL);
 * otherwise starts a throw-away PostgreSQL with the `embedded-postgres` package.
 * The test database is wiped and migrated from prisma/migrations/*.sql.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  let url = process.env.TEST_DATABASE_URL;
  if (!url) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const EmbeddedPostgres = require('embedded-postgres').default;
    const port = 56000 + Math.floor(Math.random() * 1000);
    const pg = new EmbeddedPostgres({
      databaseDir: join(tmpdir(), `wardrobe-test-pg-${process.pid}-${Date.now()}`),
      user: 'postgres',
      password: 'postgres',
      port,
      persistent: false,
      onLog: () => undefined,
      onError: () => undefined,
    });
    await pg.initialise();
    await pg.start();
    await pg.createDatabase('wardrobe_test');
    url = `postgresql://postgres:postgres@localhost:${port}/wardrobe_test`;
    process.env.TEST_DATABASE_URL = url;
    await resetDatabase(url);
    return async () => pg.stop();
  }
  process.env.TEST_DATABASE_URL = url;
  await resetDatabase(url);
  return async () => undefined;
}
