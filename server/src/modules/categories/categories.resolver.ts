import { Query, Resolver } from '@nestjs/graphql';
import { CategoriesService } from './categories.service';
import { CategoryModel } from './models/category.model';

@Resolver(() => CategoryModel)
export class CategoriesResolver {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Query(() => [CategoryModel])
  categories() {
    return this.categoriesService.list();
  }
}
