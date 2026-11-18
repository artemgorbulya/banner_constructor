import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { put } from '@vercel/blob';
import { POST } from '../../app/api/stats/route';

vi.mock('@vercel/blob', () => ({ put: vi.fn(() => Promise.resolve({})) }));

const valid = {
  width: 880, height: 408, format: 'png',
  counts: { text: 1, image: 0, colorBlock: 0 }, texts: ['Hi'], thumbnail: null,
};

const req = body => new Request('http://localhost/api/stats', {
  method: 'POST',
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

describe('POST /api/stats', () => {
  beforeEach(() => {
    put.mockClear();
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'test-token');
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('returns 204 and stores nothing when Blob is not configured', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
    vi.stubEnv('BLOB_STORE_ID', '');
    const res = await POST(req(valid));
    expect(res.status).toBe(204);
    expect(put).not.toHaveBeenCalled();
  });

  it('stores a valid event as its own private JSON blob', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1763546400000);
    const res = await POST(req(valid));
    expect(res.status).toBe(204);
    expect(put).toHaveBeenCalledTimes(1);
    const [path, body, opts] = put.mock.calls[0];
    expect(path).toBe('stats/1763546400000__web-banner__880x408__png.json');
    expect(JSON.parse(body)).toMatchObject({ ...valid, preset: 'Web Banner', ts: 1763546400000 });
    expect(opts).toEqual({ access: 'private', contentType: 'application/json', addRandomSuffix: true });
    vi.restoreAllMocks();
  });

  it('stores events when only BLOB_STORE_ID is set (OIDC auth on Vercel)', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
    vi.stubEnv('BLOB_STORE_ID', 'store_abc');
    const res = await POST(req(valid));
    expect(res.status).toBe(204);
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('uses public access when STATS_BLOB_ACCESS=public', async () => {
    vi.stubEnv('STATS_BLOB_ACCESS', 'public');
    await POST(req(valid));
    expect(put.mock.calls[0][2].access).toBe('public');
  });

  it('rejects invalid JSON with 400', async () => {
    const res = await POST(req('{nope'));
    expect(res.status).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });

  it('rejects an invalid event with 400', async () => {
    const res = await POST(req({ ...valid, format: 'gif' }));
    expect(res.status).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });

  it('rejects oversized payloads with 413', async () => {
    const res = await POST(req({ ...valid, thumbnail: 'data:image/jpeg;base64,' + 'A'.repeat(120 * 1024) }));
    expect(res.status).toBe(413);
    expect(put).not.toHaveBeenCalled();
  });

  it('returns 502 when storage fails', async () => {
    put.mockRejectedValueOnce(new Error('blob down'));
    const res = await POST(req(valid));
    expect(res.status).toBe(502);
  });
});
