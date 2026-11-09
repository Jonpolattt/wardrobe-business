import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

const MIGRATIONS = join(__dirname, '..', '..', 'prisma', 'migrations');

/** Drops everything and applies the migration SQL files in order (same SQL as `prisma migrate deploy`). */
export async function resetDatabase(url: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    for (const dir of readdirSync(MIGRATIONS).filter((d) => /^\d+_/.test(d)).sort()) {
      await client.query(readFileSync(join(MIGRATIONS, dir, 'migration.sql'), 'utf8'));
    }
  } finally {
    await client.end();
  }
}

/** Removes business data between test files; accounts are re-created by the seed. */
export async function truncateAll(url: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`TRUNCATE "store_sales", "store_products", "sync_runs", "purchases", "products", "batches", "activity_events", "sessions", "users", "categories", "app_settings" RESTART IDENTITY CASCADE`);
  } finally {
    await client.end();
  }
}
