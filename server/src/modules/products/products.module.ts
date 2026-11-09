import { Module } from '@nestjs/common';
import { ProductsResolver } from './products.resolver';
import { ProductsService } from './products.service';

@Module({ providers: [ProductsService, ProductsResolver], exports: [ProductsService] })
export class ProductsModule {}
