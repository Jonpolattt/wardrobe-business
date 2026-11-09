/**
 * Server-side client of the online store backend (style-hub-back, GraphQL).
 * Credentials stay on this server; the browser never talks to the store.
 *
 * Used store API (requires a store user with role ADMIN):
 *  - mutation login(input: { identifier, password }) → accessToken
 *  - query productsAdmin(filter: ProductFilterInput!) → { list, total }
 *  - query allOrders(filter: OrderFilterInput!) → { list, total }
 */
export interface StoreClientConfig {
  graphqlUrl: string;
  login: string;
  password: string;
  pageSize: number;
  timeoutMs: number;
}

export interface StoreProductDto {
  id: string;
  sku: string;
  title: string;
  titleRu: string | null;
  price: number;
  stock: number;
  soldCount: number;
  isActive: boolean;
}

export interface StoreOrderItemDto {
  id: string;
  productId: string;
  title: string;
  price: number;
  quantity: number;
}

export interface StoreOrderDto {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: StoreOrderItemDto[];
}

export class StoreApiError extends Error {}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

const LOGIN = `mutation WardrobeSyncLogin($input: LoginInput!) {
  login(input: $input) { accessToken user { role } }
}`;

const PRODUCTS = `query WardrobeSyncProducts($filter: ProductFilterInput!) {
  productsAdmin(filter: $filter) { total list { id sku title titleRu price stock soldCount isActive } }
}`;

const ORDERS = `query WardrobeSyncOrders($filter: OrderFilterInput!) {
  allOrders(filter: $filter) { total list { id orderNumber status paymentStatus createdAt items { id productId title price quantity } } }
}`;

export class StoreClient {
  private token: string | null = null;

  constructor(
    private readonly config: StoreClientConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async *products(): AsyncGenerator<StoreProductDto[]> {
    yield* this.paginate<StoreProductDto>(PRODUCTS, 'productsAdmin', { sort: 'NEWEST' });
  }

  async *orders(): AsyncGenerator<StoreOrderDto[]> {
    yield* this.paginate<StoreOrderDto>(ORDERS, 'allOrders', {});
  }

  private async *paginate<T>(query: string, field: string, extra: Record<string, unknown>): AsyncGenerator<T[]> {
    const limit = this.config.pageSize;
    for (let page = 1; page < 10_000; page += 1) {
      const data = await this.request<Record<string, { total: number; list: T[] }>>(query, { filter: { ...extra, page, limit } });
      const result = data[field];
      if (!result) throw new StoreApiError(`Unexpected store response: no ${field}`);
      yield result.list;
      if (result.list.length < limit || page * limit >= result.total) return;
    }
  }

  private async request<T>(query: string, variables: Record<string, unknown>, retry = true): Promise<T> {
    if (!this.token) this.token = await this.authenticate();
    const body = await this.post(query, variables, this.token);
    if (body.errors?.length) {
      const unauthorized = body.errors.some((e) => /unauthor|jwt|token|forbidden/i.test(e.message ?? '') || e.extensions?.code === 'UNAUTHENTICATED');
      if (unauthorized && retry) {
        this.token = null;
        return this.request<T>(query, variables, false);
      }
      throw new StoreApiError(`Store API error: ${body.errors.map((e) => e.message).join('; ')}`);
    }
    return body.data as T;
  }

  private async authenticate(): Promise<string> {
    const body = await this.post(LOGIN, { input: { identifier: this.config.login, password: this.config.password } });
    const login = (body.data as { login?: { accessToken: string; user: { role: string } } } | undefined)?.login;
    if (body.errors?.length || !login?.accessToken) {
      throw new StoreApiError(`Store login failed: ${body.errors?.map((e) => e.message).join('; ') ?? 'no token'}`);
    }
    if (login.user.role !== 'ADMIN') throw new StoreApiError('Store login must belong to an ADMIN user');
    return login.accessToken;
  }

  private async post(query: string, variables: Record<string, unknown>, token?: string) {
    let response: Response;
    try {
      response = await this.fetchImpl(this.config.graphqlUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'apollo-require-preflight': 'true',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      throw new StoreApiError(`Store is unreachable: ${(error as Error).message}`);
    }
    let parsed: { data?: unknown; errors?: { message: string; extensions?: { code?: string } }[] };
    try {
      parsed = (await response.json()) as typeof parsed;
    } catch {
      throw new StoreApiError(`Store returned HTTP ${response.status} without JSON`);
    }
    if (!response.ok && !parsed.errors) throw new StoreApiError(`Store returned HTTP ${response.status}`);
    return parsed;
  }
}

/** The store moves stock out exactly when an order is PAID and not CANCELLED (style-hub-back stockIsOut). */
export const isCountedSale = (order: Pick<StoreOrderDto, 'status' | 'paymentStatus'>) =>
  order.paymentStatus === 'PAID' && order.status !== 'CANCELLED';
