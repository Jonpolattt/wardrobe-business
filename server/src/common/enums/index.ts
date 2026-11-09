import { registerEnumType } from '@nestjs/graphql';
import { BatchStatus, Currency, GarmentKind, PricingMode, SyncStatus } from '../../generated/prisma/enums';

registerEnumType(Currency, { name: 'Currency' });
registerEnumType(PricingMode, { name: 'PricingMode', description: 'MARKUP — markup percent is entered; PRICE — sale price is entered' });
registerEnumType(BatchStatus, { name: 'BatchStatus' });
registerEnumType(GarmentKind, { name: 'GarmentKind' });
registerEnumType(SyncStatus, { name: 'SyncStatus' });

export enum ChartRange {
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}
registerEnumType(ChartRange, { name: 'ChartRange' });

export { BatchStatus, Currency, GarmentKind, PricingMode, SyncStatus };
