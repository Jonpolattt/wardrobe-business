import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import type { GqlContext } from '../../common/types';
import { AuthService } from './auth.service';
import { AuthPayloadModel } from './dto/auth-payload.model';
import { LoginInput } from './dto/login.input';

/**
 * Authentication. There is no registration and no API that creates users:
 * the two accounts are created only by the idempotent seed script.
 */
@Resolver()
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: () => Number(process.env.LOGIN_RATE_LIMIT ?? 5), ttl: 60_000 } })
  @Mutation(() => AuthPayloadModel, { description: 'Sign in; sets the HttpOnly refresh cookie' })
  login(@Args('input') input: LoginInput, @Context() ctx: GqlContext) {
    return this.auth.login(input.email, input.password, ctx.req, ctx.res);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Mutation(() => AuthPayloadModel, { description: 'Rotates the refresh cookie and returns a new access token' })
  refreshSession(@Context() ctx: GqlContext) {
    return this.auth.refresh(ctx.req, ctx.res);
  }

  @Public()
  @Mutation(() => Boolean, { description: 'Revokes the current session and clears the refresh cookie' })
  logout(@Context() ctx: GqlContext) {
    return this.auth.logout(ctx.req, ctx.res);
  }
}
