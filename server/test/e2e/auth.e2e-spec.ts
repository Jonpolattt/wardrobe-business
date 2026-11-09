import request from 'supertest';
import { Client } from 'pg';
import { seed } from '../../prisma/seed-lib';
import { createTestApp, gql, login, LOGIN, refreshCookie, TestContext, USERS } from '../support/app';

const ME = `{ me { id email } }`;
const REFRESH = `mutation { refreshSession { accessToken user { email } } }`;

describe('authentication', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => ctx.close());

  it('signs in with both accounts (e-mail is case-insensitive)', async () => {
    const one = await login(ctx.app, { ...USERS.one, email: USERS.one.email.toUpperCase() });
    const two = await login(ctx.app, USERS.two);
    expect(one.userId).not.toBe(two.userId);
    expect(one.cookie).toMatch(/^wb_refresh=/);
    const me = await gql<{ me: { email: string } }>(ctx.app, ME, {}, { token: two.token });
    expect(me.data?.me.email).toBe(USERS.two.email);
  });

  it('sets the refresh token as an HttpOnly cookie', async () => {
    const res = await gql(ctx.app, LOGIN, { input: USERS.one });
    const cookie = res.cookies.find((c) => c.startsWith('wb_refresh='))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\/graphql/i);
  });

  it('rejects wrong passwords and unknown accounts', async () => {
    const wrong = await gql(ctx.app, LOGIN, { input: { email: USERS.one.email, password: 'nope-nope' } });
    expect(wrong.errors?.[0].message).toBe('INVALID_CREDENTIALS');
    const unknown = await gql(ctx.app, LOGIN, { input: { email: 'third@example.test', password: 'whatever1' } });
    expect(unknown.errors?.[0].message).toBe('INVALID_CREDENTIALS');
  });

  it.each(['{ me { id } }', '{ purchases { id } }', '{ batches { id } }', '{ dashboard(filter: { periodDays: 30 }) { selection } }', '{ exchangeRates { usdToUzs } }'])(
    'denies %s without an access token',
    async (query) => {
      const res = await gql(ctx.app, query);
      expect(res.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
      expect(res.data ?? null).toBeNull();
    },
  );

  it('denies uploads without an access token', async () => {
    const res = await request(ctx.app.getHttpServer()).post('/uploads').attach('file', Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'a.jpg');
    expect(res.status).toBe(401);
  });

  it('offers no way to create a third user', async () => {
    const schema = await gql<{ __schema: { mutationType: { fields: { name: string }[] } } }>(ctx.app, '{ __schema { mutationType { fields { name } } } }');
    const names = schema.data!.__schema.mutationType.fields.map((f) => f.name.toLowerCase());
    expect(names.filter((n) => /register|signup|createuser|adduser|invite/.test(n))).toEqual([]);
    // The database itself refuses a third account.
    const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
    await client.connect();
    await expect(
      client.query(`INSERT INTO users (id, slot, email, "passwordHash", "updatedAt") VALUES ('x3', 3, 'third@example.test', 'x', now())`),
    ).rejects.toThrow(/users_slot_check/);
    await client.end();
    expect(await ctx.prisma.user.count()).toBe(2);
  });

  it('rotates the refresh token and detects reuse of an old one', async () => {
    const first = await login(ctx.app, USERS.one);
    const rotated = await gql<{ refreshSession: { accessToken: string } }>(ctx.app, REFRESH, {}, { cookie: first.cookie });
    const second = refreshCookie(rotated.cookies);
    expect(second).toBeTruthy();
    expect(second).not.toBe(first.cookie);
    // Re-using the first token later (outside the parallel-refresh window) revokes the whole session family.
    await ctx.prisma.session.update({ where: { id: sessionIdOf(first.cookie) }, data: { revokedAt: new Date(Date.now() - 60_000) } });
    const reuse = await gql(ctx.app, REFRESH, {}, { cookie: first.cookie });
    expect(reuse.errors?.[0].message).toBe('SESSION_REVOKED');
    const afterReuse = await gql(ctx.app, REFRESH, {}, { cookie: second });
    expect(afterReuse.errors?.[0].message).toBe('SESSION_REVOKED');
    const me = await gql(ctx.app, ME, {}, { token: rotated.data!.refreshSession.accessToken });
    expect(me.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('tolerates a parallel refresh of another tab without logging the user out', async () => {
    const first = await login(ctx.app, USERS.one);
    const rotated = await gql(ctx.app, REFRESH, {}, { cookie: first.cookie });
    const second = refreshCookie(rotated.cookies);
    // The other tab still sent the previous cookie a moment later: rejected, but the family stays valid.
    const late = await gql(ctx.app, REFRESH, {}, { cookie: first.cookie });
    expect(late.errors?.[0].message).toBe('SESSION_REVOKED');
    const next = await gql<{ refreshSession: { accessToken: string } }>(ctx.app, REFRESH, {}, { cookie: second });
    expect(next.errors).toBeUndefined();
    expect(next.data!.refreshSession.accessToken).toBeTruthy();
  });

  it('logout revokes the session and its access token', async () => {
    const s = await login(ctx.app, USERS.two);
    expect((await gql(ctx.app, ME, {}, { token: s.token })).data).toBeTruthy();
    await gql(ctx.app, 'mutation { logout }', {}, { cookie: s.cookie });
    expect((await gql(ctx.app, ME, {}, { token: s.token })).errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
    expect((await gql(ctx.app, REFRESH, {}, { cookie: s.cookie })).errors?.[0].message).toBe('SESSION_REVOKED');
  });

  it('changes the e-mail only with the current password and keeps e-mails unique', async () => {
    const s = await login(ctx.app, USERS.two);
    const CHANGE = `mutation($input: ChangeEmailInput!) { changeEmail(input: $input) { email } }`;
    const wrong = await gql(ctx.app, CHANGE, { input: { currentPassword: 'bad-password', newEmail: 'new.two@example.test' } }, { token: s.token });
    expect(wrong.errors?.[0].message).toBe('PASSWORD_INCORRECT');
    const taken = await gql(ctx.app, CHANGE, { input: { currentPassword: USERS.two.password, newEmail: USERS.one.email } }, { token: s.token });
    expect(taken.errors?.[0].message).toBe('EMAIL_TAKEN');
    const ok = await gql<{ changeEmail: { email: string } }>(ctx.app, CHANGE, { input: { currentPassword: USERS.two.password, newEmail: 'New.Two@Example.test' } }, { token: s.token });
    expect(ok.data?.changeEmail.email).toBe('new.two@example.test');
    USERS.two.email = 'new.two@example.test';
  });

  it('changes the password, revokes other sessions and keeps this browser signed in', async () => {
    const other = await login(ctx.app, USERS.one);
    const current = await login(ctx.app, USERS.one);
    const CHANGE = `mutation($input: ChangePasswordInput!) { changePassword(input: $input) { accessToken } }`;
    const res = await gql<{ changePassword: { accessToken: string } }>(
      ctx.app,
      CHANGE,
      { input: { currentPassword: USERS.one.password, newPassword: 'brand-New-pass-9' } },
      { token: current.token },
    );
    expect(res.data?.changePassword.accessToken).toBeTruthy();
    expect((await gql(ctx.app, ME, {}, { token: other.token })).errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
    expect((await gql(ctx.app, REFRESH, {}, { cookie: other.cookie })).errors).toBeTruthy();
    expect((await gql(ctx.app, ME, {}, { token: res.data!.changePassword.accessToken })).data).toBeTruthy();
    const old = await gql(ctx.app, LOGIN, { input: USERS.one });
    expect(old.errors?.[0].message).toBe('INVALID_CREDENTIALS');
    USERS.one.password = 'brand-New-pass-9';
    await login(ctx.app, USERS.one);
  });

  it('re-running the seed does not reset changed e-mails or passwords', async () => {
    await seed(
      ctx.prisma,
      { SEED_USER1_EMAIL: 'owner.one@example.test', SEED_USER1_PASSWORD: 'first-Password-1', SEED_USER2_EMAIL: 'owner.two@example.test', SEED_USER2_PASSWORD: 'second-Password-2' },
      () => undefined,
    );
    expect(await ctx.prisma.user.count()).toBe(2);
    await login(ctx.app, USERS.one); // new password still works
    await login(ctx.app, USERS.two); // new e-mail still works
    const old = await gql(ctx.app, LOGIN, { input: { email: 'owner.two@example.test', password: 'second-Password-2' } });
    expect(old.errors?.[0].message).toBe('INVALID_CREDENTIALS');
  });
});

/** "wb_refresh=<sessionId>.<secret>" → sessionId */
function sessionIdOf(cookie: string) {
  return decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1)).split('.')[0];
}
