import request from 'supertest';
import { deflateSync } from 'zlib';
import { createTestApp, login, TestContext, USERS } from '../support/app';

/** A real 2×2 PNG image. */
function png() {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(2, 0);
  header.writeUInt32BE(2, 4);
  header[8] = 8;
  header[9] = 2;
  const raw = Buffer.from([0, 255, 0, 0, 255, 0, 0, 0, 255, 0, 0, 255, 0, 0]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('photo uploads', () => {
  let ctx: TestContext;
  let token: string;
  beforeAll(async () => {
    ctx = await createTestApp();
    token = (await login(ctx.app, USERS.one)).token;
  });
  afterAll(async () => ctx.close());

  it('requires authentication', async () => {
    const res = await request(ctx.app.getHttpServer()).post('/uploads').attach('file', png(), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });

  it('stores an image and serves it from the returned URL', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/uploads')
      .set('authorization', `Bearer ${token}`)
      .attach('file', png(), { filename: 'photo.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^\/uploads\/\d{4}-\d{2}\/[0-9a-f-]{36}\.png$/);
    const served = await request(ctx.app.getHttpServer()).get(res.body.url);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect(served.headers['x-content-type-options']).toBe('nosniff');
  });

  it('rejects files that are not images even with an image type', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/uploads')
      .set('authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('FILE_TYPE_NOT_ALLOWED');
  });
});
