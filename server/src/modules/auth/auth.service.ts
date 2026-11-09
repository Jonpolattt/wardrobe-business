import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword, verifyPassword } from '../../common/utils/password';
import { SessionService, IssuedRefreshToken } from './session.service';
import type { User } from '../../generated/prisma/client';
import type { AccessTokenPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sessions: SessionService,
  ) {}

  async login(email: string, password: string, req: Request, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Compare against a dummy hash for unknown e-mails so the response time does not reveal accounts.
    const ok = await verifyPassword(password, user?.passwordHash ?? (await this.getDummyHash()));
    if (!user || !ok) throw new UnauthorizedException('INVALID_CREDENTIALS');
    const refresh = await this.sessions.create(user.id, this.clientInfo(req));
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.respond(user, refresh, res);
  }

  async refresh(req: Request, res: Response) {
    try {
      const { user, refresh } = await this.sessions.rotate(this.readCookie(req), this.clientInfo(req));
      return this.respond(user, refresh, res);
    } catch (error) {
      this.clearCookie(res);
      throw error;
    }
  }

  async logout(req: Request, res: Response) {
    await this.sessions.revokeByToken(this.readCookie(req));
    this.clearCookie(res);
    return true;
  }

  /** Issues a fresh session after all old ones were revoked (password change). */
  async reissue(user: User, req: Request, res: Response) {
    const refresh = await this.sessions.create(user.id, this.clientInfo(req));
    return this.respond(user, refresh, res);
  }

  private async respond(user: User, refresh: IssuedRefreshToken, res: Response) {
    const session = await this.prisma.session.findUniqueOrThrow({ where: { id: refresh.sessionId } });
    const payload: AccessTokenPayload = { sub: user.id, fam: session.familyId };
    const expiresIn = this.config.getOrThrow<number>('auth.accessTtlSeconds');
    const accessToken = await this.jwt.signAsync(payload, { expiresIn });
    this.setCookie(res, refresh);
    return { accessToken, expiresIn, user };
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<boolean>('auth.cookieSecure') ?? false,
      sameSite: 'lax' as const,
      path: '/graphql',
      domain: this.config.get<string>('auth.cookieDomain'),
    };
  }

  private setCookie(res: Response, refresh: IssuedRefreshToken) {
    res.cookie(this.config.getOrThrow<string>('auth.cookieName'), refresh.token, { ...this.cookieOptions(), expires: refresh.expiresAt });
  }

  private clearCookie(res: Response) {
    res.clearCookie(this.config.getOrThrow<string>('auth.cookieName'), this.cookieOptions());
  }

  private readCookie(req: Request): string | undefined {
    return req.cookies?.[this.config.getOrThrow<string>('auth.cookieName')];
  }

  private clientInfo(req: Request) {
    return { userAgent: req.headers['user-agent'] ?? null, ip: req.ip ?? null };
  }

  private getDummyHash() {
    this.dummyHash ??= hashPassword('wardrobe-dummy-password');
    return this.dummyHash;
  }
}
