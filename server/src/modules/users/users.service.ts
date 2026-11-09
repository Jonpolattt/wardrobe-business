import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword, verifyPassword } from '../../common/utils/password';
import { SessionService } from '../auth/session.service';
import { ActivityService } from '../activity/activity.service';
import type { ChangeEmailInput, ChangePasswordInput, UpdateProfileInput } from './dto/profile.inputs';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly activity: ActivityService,
  ) {}

  findById(id: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id } });
  }

  /** Confirms a destructive action with the user's own password. */
  async assertPassword(userId: string, password: string | undefined | null) {
    const user = await this.findById(userId);
    if (!password || !(await verifyPassword(password, user.passwordHash))) throw new ForbiddenException('PASSWORD_INCORRECT');
    return user;
  }

  updateProfile(userId: string, input: UpdateProfileInput) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone === undefined ? undefined : input.phone || null,
        photoUrl: input.photoUrl === undefined ? undefined : input.photoUrl || null,
      },
    });
  }

  async changeEmail(userId: string, input: ChangeEmailInput) {
    const user = await this.assertPassword(userId, input.currentPassword);
    if (user.email === input.newEmail) return user;
    const taken = await this.prisma.user.findUnique({ where: { email: input.newEmail } });
    if (taken) throw new ConflictException('EMAIL_TAKEN');
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { email: input.newEmail } });
    await this.activity.log('EMAIL_CHANGED', updated.email, userId);
    return updated;
  }

  /** Changes the password and revokes every existing session (including other devices). */
  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await this.assertPassword(userId, input.currentPassword);
    if (await verifyPassword(input.newPassword, user.passwordHash)) throw new BadRequestException('PASSWORD_SAME_AS_OLD');
    const passwordHash = await hashPassword(input.newPassword);
    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: new Date() } });
      await this.sessions.revokeAllForUser(userId, 'password-changed', tx);
      return saved;
    });
    await this.activity.log('PASSWORD_CHANGED', updated.email, userId);
    return updated;
  }

  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await this.sessions.listActive(userId);
    return sessions.map((s) => ({ ...s, current: s.id === currentSessionId }));
  }

  revokeSession(userId: string, sessionId: string) {
    return this.sessions.revokeOne(userId, sessionId);
  }
}
