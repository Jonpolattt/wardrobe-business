import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { SyncStatus } from '../../../common/enums';

@ObjectType('SyncRun')
export class SyncRunModel {
  @Field(() => ID)
  id: string;

  @Field(() => SyncStatus)
  status: SyncStatus;

  @Field()
  trigger: string;

  @Field()
  startedAt: Date;

  @Field(() => Date, { nullable: true })
  finishedAt: Date | null;

  @Field(() => Int)
  productsSeen: number;

  @Field(() => Int)
  ordersSeen: number;

  @Field(() => Int)
  salesCreated: number;

  @Field(() => Int)
  salesUpdated: number;

  @Field(() => Int)
  productsLinked: number;

  @Field(() => String, { nullable: true })
  error: string | null;
}

@ObjectType('StoreSyncStatus')
export class StoreSyncStatusModel {
  @Field({ description: 'STORE_GRAPHQL_URL, STORE_LOGIN and STORE_PASSWORD are set on the server' })
  configured: boolean;

  @Field(() => SyncRunModel, { nullable: true })
  lastRun: SyncRunModel | null;
}
