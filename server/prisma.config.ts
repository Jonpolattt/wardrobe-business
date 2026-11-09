import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Not required for `prisma generate` (runs on npm install, before .env exists);
    // migrate / studio need DATABASE_URL from server/.env or the environment.
    url: process.env.DATABASE_URL ?? '',
  },
});
