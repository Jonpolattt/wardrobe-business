/**
 * Idempotent seed.
 *  - Creates exactly two accounts with STABLE ids (slot 1 and slot 2).
 *  - If an account already exists it is left untouched: changed e-mails and
 *    passwords are never reset by re-running the seed.
 *  - Initial e-mails/passwords come from environment variables only.
 *  - Also creates the default categories and exchange rates (if missing).
 */
import * as bcrypt from 'bcryptjs';
import type { PrismaClient } from '../src/generated/prisma/client';

export const ACCOUNT_IDS = {
  1: '7f0c5a3e-1b2d-4c6e-9a10-000000000001',
  2: '7f0c5a3e-1b2d-4c6e-9a10-000000000002',
} as const;

const CATEGORIES = [
  { key: 'T-shirts', nameRu: 'Футболки', nameUz: 'Futbolkalar' },
  { key: 'Shirts', nameRu: 'Рубашки', nameUz: 'Ko‘ylaklar' },
  { key: 'Trousers', nameRu: 'Брюки', nameUz: 'Shimlar' },
  { key: 'Outerwear', nameRu: 'Верхняя одежда', nameUz: 'Ustki kiyim' },
  { key: 'Knitwear', nameRu: 'Трикотаж', nameUz: 'Trikotaj' },
  { key: 'Other', nameRu: 'Другое', nameUz: 'Boshqa' },
];

export async function seed(prisma: PrismaClient, env: NodeJS.ProcessEnv = process.env, log: (m: string) => void = console.log) {
  for (const slot of [1, 2] as const) {
    const id = ACCOUNT_IDS[slot];
    const existing = await prisma.user.findUnique({ where: { id } });
    if (existing) {
      log(`Account ${slot}: already exists (${existing.email}) — left unchanged`);
      continue;
    }
    const email = env[`SEED_USER${slot}_EMAIL`]?.trim().toLowerCase();
    const password = env[`SEED_USER${slot}_PASSWORD`];
    if (!email || !password) throw new Error(`SEED_USER${slot}_EMAIL and SEED_USER${slot}_PASSWORD must be set to create account ${slot}`);
    if (password.length < 8) throw new Error(`SEED_USER${slot}_PASSWORD must contain at least 8 characters`);
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken) throw new Error(`Cannot create account ${slot}: e-mail ${email} is already used by the other account`);
    await prisma.user.create({
      data: {
        id,
        slot,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        firstName: env[`SEED_USER${slot}_FIRST_NAME`] ?? '',
        lastName: env[`SEED_USER${slot}_LAST_NAME`] ?? '',
      },
    });
    log(`Account ${slot}: created (${email})`);
  }

  for (const [index, category] of CATEGORIES.entries()) {
    await prisma.category.upsert({ where: { key: category.key }, update: {}, create: { ...category, sortOrder: index } });
  }
  await prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, usdToUzs: '12840', usdToCny: '7.1' } });
  log('Categories and exchange rates are in place');
}
