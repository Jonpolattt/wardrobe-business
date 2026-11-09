import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SessionService } from './session.service';
import type { AuthUser } from '../../common/types';

export interface AccessTokenPayload {
  sub: string;
  /** rotation family of the refresh session */
  fam: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly sessions: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('auth.accessSecret'),
      algorithms: ['HS256'],
    });
  }

  /** Every request re-checks that the session family is still active (logout / password change revoke it). */
  async validate(payload: AccessTokenPayload): Promise<AuthUser> {
    if (!payload?.sub || !payload?.fam) throw new UnauthorizedException('TOKEN_INVALID');
    const active = await this.sessions.findFamilyActive(payload.fam);
    if (!active || active.userId !== payload.sub) throw new UnauthorizedException('SESSION_REVOKED');
    return { ...active.user, sessionId: active.id };
  }
}
