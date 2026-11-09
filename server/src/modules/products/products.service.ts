import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';

export const productInclude = { category: true, storeProduct: true } satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  search(query: string | undefined, limit = 20) {
    const q = query?.trim();
    return this.prisma.product.findMany({
      where: {
        archivedAt: null,
        ...(q
          ? {
              OR: [
                { nameRu: { contains: q, mode: 'insensitive' } },
                { nameUz: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } },
                { sku: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: productInclude,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  /** Next human readable code: WR-001, WR-002… */
  async nextCode(tx: Prisma.TransactionClient) {
    const rows = await tx.$queryRaw<{ max: number | null }[]>`
      SELECT MAX(CAST(SUBSTRING("code" FROM 4) AS INTEGER)) AS max FROM "products" WHERE "code" ~ '^WR-[0-9]+$'`;
    return `WR-${String((rows[0]?.max ?? 0) + 1).padStart(3, '0')}`;
  }

  /**
   * Links a product to the store product with the same SKU (stable external id is
   * stored; later SKU changes in the store do not break the link).
   */
  async linkBySku(productId: string, sku: string | null, tx: Prisma.TransactionClient) {
    if (!sku) {
      await tx.product.update({ where: { id: productId }, data: { storeProductId: null } });
      return null;
    }
    // The interface asks for the «ID / SKU» of the store product: both stable identifiers are accepted.
    const storeProduct =
      (await tx.storeProduct.findFirst({ where: { sku }, include: { product: true } })) ??
      (await tx.storeProduct.findFirst({ where: { externalId: sku }, include: { product: true } }));
    if (!storeProduct || (storeProduct.product && storeProduct.product.id !== productId)) {
      const current = await tx.product.findUnique({ where: { id: productId }, include: { storeProduct: true } });
      if (current?.storeProduct && current.storeProduct.sku !== sku && current.storeProduct.externalId !== sku) {
        await tx.product.update({ where: { id: productId }, data: { storeProductId: null } });
      }
      return null;
    }
    await tx.product.update({ where: { id: productId }, data: { storeProductId: storeProduct.externalId } });
    return storeProduct.externalId;
  }
}
