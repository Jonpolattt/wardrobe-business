import { Mutation, Query, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { StoreSyncStatusModel, SyncRunModel } from './models/sync.models';
import { StoreSyncService } from './store-sync.service';

@Resolver()
export class IntegrationsResolver {
  constructor(private readonly sync: StoreSyncService) {}

  @Query(() => StoreSyncStatusModel)
  async storeSyncStatus() {
    return { configured: this.sync.isConfigured, lastRun: await this.sync.status() };
  }

  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Mutation(() => SyncRunModel, { description: 'Imports products and sales from the online store now' })
  syncStore() {
    return this.sync.sync('MANUAL');
  }
}
