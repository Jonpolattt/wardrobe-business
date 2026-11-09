import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';

export type ActivityType =
  | 'PURCHASE_CREATED'
  | 'PURCHASE_UPDATED'
  | 'PURCHASE_DELETED'
  | 'PURCHASE_ARCHIVED'
  | 'BATCH_CREATED'
  | 'BATCH_UPDATED'
  | 'BATCH_DELETED'
  | 'BATCH_ARCHIVED'
  | 'RATES_UPDATED'
  | 'SYNC_COMPLETED'
  | 'SYNC_FAILED'
  | 'EMAIL_CHANGED'
  | 'PASSWORD_CHANGED';

/** Append-only activity log shown in the "Последние события" block. */
@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  log(type: ActivityType, title: string, userId: string | null, meta?: Prisma.InputJsonValue, tx: Prisma.TransactionClient = this.prisma) {
    return tx.activityEvent.create({ data: { type, title: title.slice(0, 200), userId, meta } });
  }

  latest(limit: number) {
    return this.prisma.activityEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
  }
}
