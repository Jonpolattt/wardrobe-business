import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { ProductModel } from './models/product.model';
import { ProductsService } from './products.service';

@Resolver(() => ProductModel)
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  @Query(() => [ProductModel], { description: 'Catalog search (used to purchase an existing product again)' })
  products(
    @Args('search', { nullable: true }) search?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    return this.productsService.search(search, limit ?? 20);
  }
}
