import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Marks a resolver/route that does not require an access token (login, refresh, logout). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
