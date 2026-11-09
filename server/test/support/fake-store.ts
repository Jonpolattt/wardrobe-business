import { createServer, IncomingMessage, Server } from 'http';
import { AddressInfo } from 'net';

/**
 * Minimal stand-in for the style-hub-back GraphQL API, answering the three
 * operations used by the sync (login, productsAdmin, allOrders) with the same
 * response shapes and pagination.
 */
export interface FakeOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: { id: string; productId: string; title: string; price: number; quantity: number }[];
}

export class FakeStore {
  products = [
    { id: 'sp-1', sku: 'TS-001', title: 'Paxta futbolka', titleRu: 'Хлопковая футболка', price: 350000, stock: 70, soldCount: 30, isActive: true },
    { id: 'sp-2', sku: 'SH-777', title: 'Ko‘ylak', titleRu: 'Рубашка', price: 500000, stock: 5, soldCount: 2, isActive: true },
  ];
  orders: FakeOrder[] = [];
  logins = 0;
  private server: Server | null = null;
  url = '';

  async start() {
    this.server = createServer((req, res) => this.handle(req).then((body) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(body));
    }));
    await new Promise<void>((resolve) => this.server!.listen(0, '127.0.0.1', resolve));
    this.url = `http://127.0.0.1:${(this.server!.address() as AddressInfo).port}/graphql`;
  }

  stop() {
    return new Promise<void>((resolve) => this.server?.close(() => resolve()));
  }

  private async handle(req: IncomingMessage) {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const { query, variables } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (query.includes('login(')) {
      this.logins += 1;
      const ok = variables.input.identifier === 'admin@store.test' && variables.input.password === 'store-secret';
      return ok ? { data: { login: { accessToken: 'store-token', user: { role: 'ADMIN' } } } } : { errors: [{ message: 'Invalid credentials' }] };
    }
    if (req.headers.authorization !== 'Bearer store-token') return { errors: [{ message: 'Unauthorized', extensions: { code: 'UNAUTHENTICATED' } }] };
    const { page, limit } = variables.filter;
    const slice = <T>(list: T[]) => ({ total: list.length, list: list.slice((page - 1) * limit, page * limit) });
    if (query.includes('productsAdmin')) return { data: { productsAdmin: slice(this.products) } };
    if (query.includes('allOrders')) return { data: { allOrders: slice([...this.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) } };
    return { errors: [{ message: 'Unknown operation' }] };
  }
}
