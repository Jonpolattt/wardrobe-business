import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';

export interface IssuedRefreshToken {
  sessionId: string;
  token: string;
  expiresAt: Date;
}

export interface ClientInfo {
  userAgent?: string | null;
  ip?: string | null;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * Refresh-token sessions.
 * Token format: "<sessionId>.<random secret>"; only SHA-256(secret) is stored.
 * Rotation: every refresh revokes the presented session and creates a new one
 * in the same family. Re-using an already rotated token revokes the whole family
 * (token theft detection) — except within a short grace window right after the
 * rotation, which is a parallel refresh of another tab of the same browser.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get ttlMs() {
    return this.config.getOrThrow<number>('auth.refreshTtlDays') * 86_400_000;
  }

  async create(userId: string, client: ClientInfo, familyId: string = randomUUID(), tx: Prisma.TransactionClient = this.prisma): Promise<IssuedRefreshToken> {
    const secret = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + this.ttlMs);
    const session = await tx.session.create({
      data: {
        userId,
        familyId,
        tokenHash: sha256(secret),
        expiresAt,
        userAgent: client.userAgent?.slice(0, 300) ?? null,
        ip: client.ip?.slice(0, 64) ?? null,
      },
    });
    return { sessionId: session.id, token: `${session.id}.${secret}`, expiresAt };
  }

  /** Validates a refresh token and rotates it. Throws UnauthorizedException on any problem. */
  async rotate(rawToken: string | undefined, client: ClientInfo) {
    const { sessionId, secret } = this.parse(rawToken);
    const found = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!found || !this.hashMatches(secret, found.tokenHash)) throw new UnauthorizedException('SESSION_INVALID');
    if (found.revokedAt) {
      const graceMs = (this.config.get<number>('auth.refreshReuseGraceSeconds') ?? 20) * 1000;
      const parallelRefresh = found.revokedReason === 'rotated' && Date.now() - found.revokedAt.getTime() < graceMs;
      if (found.revokedReason === 'rotated' && !parallelRefresh) {
        // A rotated token was used again: somebody else may hold it → revoke the whole family.
        await this.prisma.session.updateMany({
          where: { familyId: found.familyId, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: 'reuse-detected' },
        });
      }
      throw new UnauthorizedException('SESSION_REVOKED');
    }
    if (found.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('SESSION_EXPIRED');
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.session.findUniqueOrThrow({ where: { id: sessionId }, include: { user: true } });
      // Conditional update guarantees that two parallel refreshes cannot both succeed.
      const updated = await tx.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'rotated' },
      });
      if (updated.count !== 1) throw new UnauthorizedException('SESSION_REVOKED');
      const next = await this.create(session.userId, client, session.familyId, tx);
      await tx.session.update({ where: { id: session.id }, data: { replacedById: next.sessionId } });
      return { user: session.user, refresh: next };
    });
  }

  /** Revokes the session that belongs to the presented token (logout). */
  async revokeByToken(rawToken: string | undefined) {
    let parsed: { sessionId: string; secret: string };
    try {
      parsed = this.parse(rawToken);
    } catch {
      return;
    }
    const session = await this.prisma.session.findUnique({ where: { id: parsed.sessionId } });
    if (!session || !this.hashMatches(parsed.secret, session.tokenHash)) return;
    await this.prisma.session.updateMany({
      where: { familyId: session.familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'logout' },
    });
  }

  revokeAllForUser(userId: string, reason: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } });
  }

  async revokeOne(userId: string, sessionId: string) {
    const target = await this.prisma.session.findFirst({ where: { id: sessionId, userId } });
    if (!target) return false;
    await this.prisma.session.updateMany({
      where: { familyId: target.familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'revoked-by-user' },
    });
    return true;
  }

  listActive(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  /**
   * Used by the JWT strategy: an access token is valid only while its rotation
   * family still has an active session (logout and password change revoke it).
   */
  findFamilyActive(familyId: string) {
    return this.prisma.session.findFirst({
      where: { familyId, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
  }

  private parse(rawToken: string | undefined) {
    if (!rawToken || typeof rawToken !== 'string') throw new UnauthorizedException('SESSION_MISSING');
    const dot = rawToken.indexOf('.');
    if (dot <= 0) throw new UnauthorizedException('SESSION_INVALID');
    return { sessionId: rawToken.slice(0, dot), secret: rawToken.slice(dot + 1) };
  }

  private hashMatches(secret: string, storedHash: string) {
    const a = Buffer.from(sha256(secret), 'hex');
    const b = Buffer.from(storedHash, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
