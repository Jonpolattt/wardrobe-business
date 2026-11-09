import * as bcrypt from 'bcryptjs';

export const BCRYPT_ROUNDS = 12;
export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
