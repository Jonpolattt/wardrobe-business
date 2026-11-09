import type { Request, Response } from 'express';
import type { User } from '../generated/prisma/client';

export type AuthUser = User & { sessionId: string };

export interface GqlContext {
  req: Request & { user?: AuthUser };
  res: Response;
}
