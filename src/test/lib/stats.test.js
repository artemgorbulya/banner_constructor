import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  presetLabel, buildExportEvent, trackExport, statsPath, parseStatsPath,
  summarize, kyivDay, sanitizeEvent, blobAccess, MAX_TEXTS, MAX_TEXT_LEN,
} from '../../lib/stats';

const T = (text, extra = {}) => ({ type: 'text', text, ...extra });

describe('presetLabel', () => {
  it('matches presets by exact size', () => {
    expect(presetLabel({ width: 880, height: 408 })).toBe('Web Banner');
    expect(presetLabel({ width: 1536, height: 256 })).toBe('Billboard');
    expect(presetLabel({ width: 700, height: 465 })).toBe('Promo Banner');
  });
  it('returns Custom for non-preset sizes', () => {
    expect(presetLabel({ width: 880, height: 400 })).toBe('Custom');
  });
});

describe('buildExportEvent', () => {
  it('counts element types, collects texts and keeps the thumbnail', () => {
    const ev = buildExportEvent({
      canvasSize: { width: 880, height: 408 },
      elements: [T('Знижки до -50%'), { type: 'image' }, { type: 'image' }, { type: 'colorBlock' }, { type: 'unknown' }],
      format: 'jpg',
      thumbnail: 'data:image/jpeg;base64,AAA',
    });
    expect(ev).toEqual({
      preset: 'Web Banner', width: 880, height: 408, format: 'jpg',
      counts: { text: 1, image: 2, colorBlock: 1 },
      texts: ['Знижки до -50%'],
      thumbnail: 'data:image/jpeg;base64,AAA',
    });
  });

  it('limits texts count and length, trims and skips empty ones', () => {
    const long = 'x'.repeat(MAX_TEXT_LEN + 50);
    const ev = buildExportEvent({
      canvasSize: { width: 1, height: 1 },
      elements: [T('  '), T(`  ${long}  `), ...Array.from({ length: 10 }, (_, i) => T(`t${i}`))],
      format: 'png',
    });
    expect(ev.texts).toHaveLength(MAX_TEXTS);
    expect(ev.texts[0]).toHaveLength(MAX_TEXT_LEN);
    expect(ev.thumbnail).toBeNull();
    expect(ev.preset).toBe('Custom');
  });

  it('handles empty / missing elements', () => {
    const ev = buildExportEvent({ canvasSize: { width: 880, height: 408 }, elements: undefined, format: 'png' });
    expect(ev.counts).toEqual({ text: 0, image: 0, colorBlock: 0 });
    expect(ev.texts).toEqual([]);
  });
});

describe('trackExport', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('POSTs the event as JSON with keepalive', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await trackExport({ a: 1 });
    expect(fetchMock).toHaveBeenCalledWith('/api/stats', expect.objectContaining({
      method: 'POST', keepalive: true, body: JSON.stringify({ a: 1 }),
    }));
  });

  it('never throws or rejects when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    await expect(trackExport({})).resolves.toBeUndefined();
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('sync boom'); }));
    await expect(trackExport({})).resolves.toBeUndefined();
  });
});

describe('statsPath / parseStatsPath', () => {
  const ev = { ts: 1763546400000, preset: 'Web Banner', width: 880, height: 408, format: 'png' };

  it('round-trips the encoded fields', () => {
    const p = statsPath(ev);
    expect(p).toBe('stats/1763546400000__web-banner__880x408__png.json');
    expect(parseStatsPath(p)).toEqual(ev);
  });

  it('tolerates the random suffix added by Vercel Blob', () => {
    expect(parseStatsPath('stats/1763546400000__promo-banner__700x465__jpg-Xy12AbCdEf.json'))
      .toEqual({ ts: 1763546400000, preset: 'Promo Banner', width: 700, height: 465, format: 'jpg' });
  });

  it('maps every preset and Custom back to its label', () => {
    for (const preset of ['Billboard', 'Slim Banner', 'Super Slim', 'Web Banner', 'Promo Banner', 'Custom']) {
      expect(parseStatsPath(statsPath({ ...ev, preset })).preset).toBe(preset);
    }
  });

  it('returns null for foreign pathnames', () => {
    expect(parseStatsPath('stats/readme.txt')).toBeNull();
    expect(parseStatsPath('other/1__x__1x1__png.json')).toBeNull();
    expect(parseStatsPath(undefined)).toBeNull();
  });
});

describe('summarize', () => {
  // 2026-11-19 12:00 Kyiv
  const now = Date.UTC(2026, 10, 19, 10, 0);
  const e = (ts, preset = 'Web Banner', format = 'png') => ({ ts, preset, format });

  it('aggregates totals, presets and formats', () => {
    const s = summarize([e(now), e(now, 'Billboard', 'jpg'), e(now - 86_400_000)], { now });
    expect(s.total).toBe(3);
    expect(s.byPreset).toEqual({ 'Web Banner': 2, Billboard: 1 });
    expect(s.byFormat).toEqual({ png: 2, jpg: 1 });
  });

  it('returns the last N days newest first, including empty days', () => {
    const s = summarize([e(now), e(now), e(now - 2 * 86_400_000)], { now, days: 3 });
    expect(s.byDay).toEqual([
      { day: '2026-11-19', count: 2 },
      { day: '2026-11-18', count: 0 },
      { day: '2026-11-17', count: 1 },
    ]);
  });

  it('groups by Kyiv calendar day, not UTC', () => {
    // 2026-11-18 23:30 UTC is already 2026-11-19 01:30 in Kyiv
    expect(kyivDay(Date.UTC(2026, 10, 18, 23, 30))).toBe('2026-11-19');
  });

  it('handles no data', () => {
    const s = summarize([], { now, days: 2 });
    expect(s.total).toBe(0);
    expect(s.byDay.map(d => d.count)).toEqual([0, 0]);
  });
});

describe('sanitizeEvent', () => {
  const valid = {
    preset: 'whatever', width: 880, height: 408, format: 'png',
    counts: { text: 2, image: 1, colorBlock: 0 }, texts: ['a'], thumbnail: 'data:image/jpeg;base64,AAA',
  };

  it('accepts a valid event, recomputes preset and stamps server time', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    const ev = sanitizeEvent({ ...valid, ts: 999 });
    expect(ev).toEqual({ ...valid, preset: 'Web Banner', ts: 123 });
    vi.restoreAllMocks();
  });

  it.each([
    ['not an object', null],
    ['bad width', { ...valid, width: 0 }],
    ['non-integer height', { ...valid, height: 10.5 }],
    ['huge size', { ...valid, width: 50000 }],
    ['unknown format', { ...valid, format: 'gif' }],
  ])('rejects %s', (_, body) => {
    expect(sanitizeEvent(body)).toBeNull();
  });

  it('clamps texts and counts', () => {
    const ev = sanitizeEvent({
      ...valid,
      counts: { text: -1, image: 'many', colorBlock: 5000 },
      texts: ['ok', 7, 'x'.repeat(500), ...Array(10).fill('t')],
      thumbnail: undefined,
    });
    expect(ev.counts).toEqual({ text: 0, image: 0, colorBlock: 0 });
    expect(ev.texts).toHaveLength(MAX_TEXTS);
    expect(ev.texts[1]).toHaveLength(MAX_TEXT_LEN);
    expect(ev.thumbnail).toBeNull();
  });

  it.each([
    ['SVG', 'data:image/svg+xml;base64,AAA'],
    ['PNG', 'data:image/png;base64,AAA'],
    ['remote URL', 'https://evil.example/x.jpg'],
    ['non-string', 42],
  ])('drops a %s thumbnail but keeps the event', (_, thumbnail) => {
    const ev = sanitizeEvent({ ...valid, thumbnail });
    expect(ev).not.toBeNull();
    expect(ev.thumbnail).toBeNull();
  });

  it('defaults texts to [] when missing', () => {
    expect(sanitizeEvent({ ...valid, texts: 'nope' }).texts).toEqual([]);
  });
});

describe('blobAccess', () => {
  afterEach(() => { vi.unstubAllEnvs(); });
  it('is private by default and public only when explicitly configured', () => {
    expect(blobAccess()).toBe('private');
    vi.stubEnv('STATS_BLOB_ACCESS', 'public');
    expect(blobAccess()).toBe('public');
    vi.stubEnv('STATS_BLOB_ACCESS', 'whatever');
    expect(blobAccess()).toBe('private');
  });
});
