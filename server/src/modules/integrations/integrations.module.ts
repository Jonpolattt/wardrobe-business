import { Module } from '@nestjs/common';
import { IntegrationsResolver } from './integrations.resolver';
import { StoreSyncService } from './store-sync.service';

@Module({ providers: [StoreSyncService, IntegrationsResolver], exports: [StoreSyncService] })
export class IntegrationsModule {}
