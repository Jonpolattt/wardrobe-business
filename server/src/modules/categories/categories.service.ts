import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }] });
  }

  async getByKey(key: string, tx: Prisma.TransactionClient = this.prisma) {
    const category = await tx.category.findUnique({ where: { key } });
    if (!category) throw new BadRequestException('CATEGORY_NOT_FOUND');
    return category;
  }
}
