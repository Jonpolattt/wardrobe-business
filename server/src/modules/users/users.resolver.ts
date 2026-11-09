import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser, GqlContext } from '../../common/types';
import { AuthService } from '../auth/auth.service';
import { AuthPayloadModel } from '../auth/dto/auth-payload.model';
import { ChangeEmailInput, ChangePasswordInput, UpdateProfileInput } from './dto/profile.inputs';
import { SessionModel } from './models/session.model';
import { UserModel } from './models/user.model';
import { UsersService } from './users.service';

/** Own account only. There is intentionally no mutation that creates users. */
@Resolver(() => UserModel)
export class UsersResolver {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  @Query(() => UserModel)
  me(@CurrentUser() user: AuthUser) {
    return this.users.findById(user.id);
  }

  @Mutation(() => UserModel)
  updateProfile(@CurrentUser() user: AuthUser, @Args('input') input: UpdateProfileInput) {
    return this.users.updateProfile(user.id, input);
  }

  @Throttle({ default: { limit: () => Number(process.env.LOGIN_RATE_LIMIT ?? 5), ttl: 60_000 } })
  @Mutation(() => UserModel)
  changeEmail(@CurrentUser() user: AuthUser, @Args('input') input: ChangeEmailInput) {
    return this.users.changeEmail(user.id, input);
  }

  @Throttle({ default: { limit: () => Number(process.env.LOGIN_RATE_LIMIT ?? 5), ttl: 60_000 } })
  @Mutation(() => AuthPayloadModel, { description: 'Changes the password, revokes all sessions and signs this browser in again' })
  async changePassword(@CurrentUser() user: AuthUser, @Args('input') input: ChangePasswordInput, @Context() ctx: GqlContext) {
    const updated = await this.users.changePassword(user.id, input);
    return this.auth.reissue(updated, ctx.req, ctx.res);
  }

  @Query(() => [SessionModel])
  mySessions(@CurrentUser() user: AuthUser) {
    return this.users.listSessions(user.id, user.sessionId);
  }

  @Mutation(() => Boolean)
  revokeSession(@CurrentUser() user: AuthUser, @Args('id', { type: () => ID }) id: string) {
    return this.users.revokeSession(user.id, id);
  }
}
