import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { PurchaseFilterInput, PurchaseInput } from './dto/purchase.input';
import { DeleteResultModel, PurchaseModel } from './models/purchase.model';
import { PurchasesService } from './purchases.service';

@Resolver(() => PurchaseModel)
export class PurchasesResolver {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Query(() => [PurchaseModel])
  purchases(@Args('filter', { nullable: true }) filter?: PurchaseFilterInput) {
    return this.purchasesService.list(filter ?? {});
  }

  @Query(() => PurchaseModel)
  purchase(@Args('id', { type: () => ID }) id: string) {
    return this.purchasesService.findOne(id);
  }

  @Mutation(() => PurchaseModel)
  createPurchase(@Args('input') input: PurchaseInput, @CurrentUser() user: AuthUser) {
    return this.purchasesService.create(input, user.id);
  }

  @Mutation(() => PurchaseModel)
  updatePurchase(@Args('id', { type: () => ID }) id: string, @Args('input') input: PurchaseInput, @CurrentUser() user: AuthUser) {
    return this.purchasesService.update(id, input, user.id);
  }

  @Mutation(() => DeleteResultModel, { description: 'Requires the current user password' })
  deletePurchase(@Args('id', { type: () => ID }) id: string, @Args('password') password: string, @CurrentUser() user: AuthUser) {
    return this.purchasesService.remove(id, password, user.id);
  }
}
