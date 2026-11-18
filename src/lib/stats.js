import { PRESETS } from './presets';

// Usage statistics: one event per banner export, stored as one blob per event
// (see src/app/api/stats/route.js). Key fields are encoded in the blob pathname
// so the /stats page can build summaries from a listing alone.

export const STATS_PREFIX = 'stats/';
export const MAX_TEXTS = 5;
export const MAX_TEXT_LEN = 100;
const CUSTOM = 'Custom';

export function presetLabel({ width, height }) {
  return PRESETS.find(p => p.width === width && p.height === height)?.label ?? CUSTOM;
}

function slug(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom';
}

const SLUG_TO_LABEL = Object.fromEntries(
  [...PRESETS.map(p => p.label), CUSTOM].map(l => [slug(l), l]),
);

// Client side: describe what was exported.
export function buildExportEvent({ canvasSize, elements, format, thumbnail }) {
  const counts = { text: 0, image: 0, colorBlock: 0 };
  for (const el of elements ?? []) {
    if (el.type in counts) counts[el.type] += 1;
  }
  const texts = (elements ?? [])
    .filter(el => el.type === 'text' && typeof el.text === 'string' && el.text.trim())
    .slice(0, MAX_TEXTS)
    .map(el => el.text.trim().slice(0, MAX_TEXT_LEN));
  return {
    preset: presetLabel(canvasSize),
    width: canvasSize.width,
    height: canvasSize.height,
    format,
    counts,
    texts,
    thumbnail: thumbnail ?? null,
  };
}

// Fire-and-forget: statistics must never break or delay the export itself.
export function trackExport(event) {
  try {
    return fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {});
  } catch {
    return Promise.resolve();
  }
}

// stats/<epoch-ms>__<preset-slug>__<W>x<H>__<format>.json
export function statsPath({ ts, preset, width, height, format }) {
  return `${STATS_PREFIX}${ts}__${slug(preset)}__${width}x${height}__${format}.json`;
}

// Tolerates the random suffix Vercel Blob may append before the extension.
export function parseStatsPath(pathname) {
  const m = /^stats\/(\d+)__([a-z0-9-]+)__(\d+)x(\d+)__(png|jpg)/.exec(pathname ?? '');
  if (!m) return null;
  return {
    ts: Number(m[1]),
    preset: SLUG_TO_LABEL[m[2]] ?? CUSTOM,
    width: Number(m[3]),
    height: Number(m[4]),
    format: m[5],
  };
}

// Calendar day in Kyiv time, e.g. "2026-11-19"
export function kyivDay(ts) {
  return new Date(ts).toLocaleDateString('sv-SE', { timeZone: 'Europe/Kyiv' });
}

// Summaries from parsed pathnames: totals, by preset, by format, last `days` days.
export function summarize(entries, { now = Date.now(), days = 14 } = {}) {
  const byPreset = {};
  const byFormat = {};
  const dayCounts = {};
  for (const e of entries) {
    byPreset[e.preset] = (byPreset[e.preset] ?? 0) + 1;
    byFormat[e.format] = (byFormat[e.format] ?? 0) + 1;
    const d = kyivDay(e.ts);
    dayCounts[d] = (dayCounts[d] ?? 0) + 1;
  }
  const byDay = [];
  for (let i = 0; i < days; i++) {
    const d = kyivDay(now - i * 86_400_000);
    byDay.push({ day: d, count: dayCounts[d] ?? 0 });
  }
  return { total: entries.length, byPreset, byFormat, byDay };
}

// ─── Server side (used by /api/stats and /stats) ──────────────────────────────

const MAX_DIMENSION = 10000;
const THUMB_PREFIX = 'data:image/jpeg;base64,';

export function blobAccess() {
  return process.env.STATS_BLOB_ACCESS === 'public' ? 'public' : 'private';
}

function intIn(v, min, max) {
  return Number.isInteger(v) && v >= min && v <= max;
}

// Returns a sanitised event or null when the payload is invalid.
export function sanitizeEvent(body) {
  if (!body || typeof body !== 'object') return null;
  const { width, height, format, counts, texts, thumbnail } = body;
  if (!intIn(width, 1, MAX_DIMENSION) || !intIn(height, 1, MAX_DIMENSION)) return null;
  if (format !== 'png' && format !== 'jpg') return null;

  const count = k => (intIn(counts?.[k], 0, 1000) ? counts[k] : 0);
  return {
    ts: Date.now(), // server time — never trust the client clock
    preset: presetLabel({ width, height }),
    width,
    height,
    format,
    counts: { text: count('text'), image: count('image'), colorBlock: count('colorBlock') },
    texts: Array.isArray(texts)
      ? texts.filter(t => typeof t === 'string').slice(0, MAX_TEXTS).map(t => t.slice(0, MAX_TEXT_LEN))
      : [],
    // Only small JPEG data URLs are kept; anything else (SVG, other types) is dropped,
    // but the export itself is still counted.
    thumbnail: typeof thumbnail === 'string' && thumbnail.startsWith(THUMB_PREFIX) ? thumbnail : null,
  };
}
