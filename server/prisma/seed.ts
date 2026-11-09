/**
 * Runs the idempotent seed (see seed-lib.ts): `npm run seed` (or `npm run db:seed` from the root).
 *
 * The initial e-mails and passwords are taken from the environment
 * (SEED_USER1_EMAIL / SEED_USER1_PASSWORD / SEED_USER2_…). When the seed runs in
 * a terminal and a value is missing for an account that does not exist yet, it
 * is asked for interactively (the password is not shown and is not saved
 * anywhere — the database keeps only its bcrypt hash).
 */
import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { ACCOUNT_IDS, seed } from './seed-lib';

async function ask(question: string) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

/** Reads a line without echoing it (for passwords). */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = '';
    const cleanup = () => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write('\n');
    };
    const onData = (chunk: string) => {
      for (const c of chunk) {
        if (c === '\r' || c === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (c === '\u0003') {
          cleanup();
          reject(new Error('Cancelled'));
          return;
        }
        if (c === '\u007f' || c === '\b') value = value.slice(0, -1);
        else value += c;
      }
    };
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required (server/.env)');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const env: NodeJS.ProcessEnv = { ...process.env };
    if (process.stdin.isTTY) {
      for (const slot of [1, 2] as const) {
        const exists = await prisma.user.findUnique({ where: { id: ACCOUNT_IDS[slot] }, select: { id: true } });
        if (exists) continue;
        const key = (name: string) => `SEED_USER${slot}_${name}`;
        if (!env[key('EMAIL')]) env[key('EMAIL')] = await ask(`Аккаунт ${slot} — email: `);
        if (!env[key('PASSWORD')]) env[key('PASSWORD')] = await askHidden(`Аккаунт ${slot} — пароль (ввод скрыт): `);
        if (env[key('FIRST_NAME')] === undefined) env[key('FIRST_NAME')] = await ask(`Аккаунт ${slot} — имя (Enter — пропустить): `);
        if (env[key('LAST_NAME')] === undefined) env[key('LAST_NAME')] = await ask(`Аккаунт ${slot} — фамилия (Enter — пропустить): `);
      }
    }
    await seed(prisma, env);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
