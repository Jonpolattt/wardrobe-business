import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { DeleteResultModel } from '../purchases/models/purchase.model';
import { BatchesService } from './batches.service';
import { BatchInput } from './dto/batch.input';
import { BatchModel } from './models/batch.model';

@Resolver(() => BatchModel)
export class BatchesResolver {
  constructor(private readonly batchesService: BatchesService) {}

  @Query(() => [BatchModel])
  batches(@Args('includeArchived', { nullable: true, defaultValue: false }) includeArchived: boolean) {
    return this.batchesService.list(includeArchived);
  }

  @Query(() => BatchModel)
  batch(@Args('id', { type: () => ID }) id: string) {
    return this.batchesService.findOne(id);
  }

  @Mutation(() => BatchModel)
  createBatch(@Args('input') input: BatchInput, @CurrentUser() user: AuthUser) {
    return this.batchesService.create(input, user.id);
  }

  @Mutation(() => BatchModel)
  updateBatch(@Args('id', { type: () => ID }) id: string, @Args('input') input: BatchInput, @CurrentUser() user: AuthUser) {
    return this.batchesService.update(id, input, user.id);
  }

  @Mutation(() => DeleteResultModel, { description: 'Requires the current user password' })
  deleteBatch(@Args('id', { type: () => ID }) id: string, @Args('password') password: string, @CurrentUser() user: AuthUser) {
    return this.batchesService.remove(id, password, user.id);
  }
}
