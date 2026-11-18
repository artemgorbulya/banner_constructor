import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

// Module keeps in-memory Maps + a DB singleton in projects.js — reset both per test
let reg;
beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  vi.resetModules();
  reg = await import('../../lib/imageRegistry.js');
});

const DATA_A = 'data:image/png;base64,AAAA';
const DATA_B = 'data:image/png;base64,BBBB';

async function readIdbImages() {
  const { getDB } = await import('../../lib/projects.js');
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('images', 'readonly').objectStore('images').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// _persistImage is fire-and-forget; wait until IDB has the expected number of rows
async function waitForIdb(count) {
  for (let i = 0; i < 50; i++) {
    const rows = await readIdbImages();
    if (rows.length >= count) return rows;
    await new Promise(r => setTimeout(r, 5));
  }
  return readIdbImages();
}

describe('storeImage', () => {
  it('passes through falsy values, library paths and http URLs unchanged', () => {
    expect(reg.storeImage(null)).toBeNull();
    expect(reg.storeImage('')).toBe('');
    expect(reg.storeImage('/library/phone.png')).toBe('/library/phone.png');
    expect(reg.storeImage('https://example.com/a.png')).toBe('https://example.com/a.png');
  });

  it('replaces data: URLs with an img_ id', () => {
    const id = reg.storeImage(DATA_A);
    expect(id).toMatch(/^img_/);
    expect(reg.resolveImage(id)).toBe(DATA_A);
  });

  it('replaces blob: URLs with an img_ id', () => {
    const id = reg.storeImage('blob:http://localhost/123');
    expect(id).toMatch(/^img_/);
  });

  it('deduplicates identical sources', () => {
    const id1 = reg.storeImage(DATA_A);
    const id2 = reg.storeImage(DATA_A);
    const id3 = reg.storeImage(DATA_B);
    expect(id1).toBe(id2);
    expect(id3).not.toBe(id1);
  });

  it('persists stored images to IndexedDB', async () => {
    const id = reg.storeImage(DATA_A);
    const rows = await waitForIdb(1);
    expect(rows).toEqual([{ id, src: DATA_A }]);
  });
});

describe('resolveImage', () => {
  it('returns unknown ids and plain srcs as-is (backward compat)', () => {
    expect(reg.resolveImage('img_unknown')).toBe('img_unknown');
    expect(reg.resolveImage(DATA_A)).toBe(DATA_A);
    expect(reg.resolveImage(null)).toBeNull();
  });
});

describe('initImageRegistry', () => {
  it('restores images saved in IDB by a previous session', async () => {
    const id = reg.storeImage(DATA_A);
    await waitForIdb(1);

    // Simulate a page reload: fresh module memory, same IndexedDB
    vi.resetModules();
    const fresh = await import('../../lib/imageRegistry.js');
    expect(fresh.resolveImage(id)).toBe(id); // not loaded yet
    await fresh.initImageRegistry();
    expect(fresh.resolveImage(id)).toBe(DATA_A);
    // dedup index is restored too
    expect(fresh.storeImage(DATA_A)).toBe(id);
  });

  it('does not throw when IndexedDB is unavailable', async () => {
    globalThis.indexedDB = undefined;
    vi.resetModules();
    const fresh = await import('../../lib/imageRegistry.js');
    await expect(fresh.initImageRegistry()).resolves.toBeUndefined();
    globalThis.indexedDB = new IDBFactory();
  });
});

describe('storeStateImages / resolveStateImages', () => {
  const state = {
    canvasSize: { width: 880, height: 408 },
    elements: [
      { id: 'a', type: 'image', src: DATA_A },
      { id: 'b', type: 'image', src: '/library/x.png' },
      { id: 'c', type: 'text', text: 'Hi' },
      { id: 'd', type: 'colorBlock', fill: '#fff' },
    ],
    backgroundImage: { src: DATA_B, x: 0, y: 0, width: 10, height: 10, rotation: 0 },
  };

  it('replaces base64 srcs of image elements and background with ids', () => {
    const out = reg.storeStateImages(state);
    expect(out.elements[0].src).toMatch(/^img_/);
    expect(out.elements[1]).toBe(state.elements[1]); // library path untouched (same ref)
    expect(out.elements[2]).toBe(state.elements[2]);
    expect(out.elements[3]).toBe(state.elements[3]);
    expect(out.backgroundImage.src).toMatch(/^img_/);
    expect(out.backgroundImage.width).toBe(10);
    expect(out.canvasSize).toBe(state.canvasSize);
    // input not mutated
    expect(state.elements[0].src).toBe(DATA_A);
  });

  it('resolveStateImages is the inverse of storeStateImages', () => {
    const stored = reg.storeStateImages(state);
    const resolved = reg.resolveStateImages(stored);
    expect(resolved.elements).toEqual(state.elements);
    expect(resolved.backgroundImage).toEqual(state.backgroundImage);
  });

  it('handles missing elements and empty background', () => {
    const out = reg.storeStateImages({ backgroundImage: { src: null } });
    expect(out.elements).toEqual([]);
    expect(out.backgroundImage).toEqual({ src: null });
    expect(reg.resolveStateImages({}).elements).toEqual([]);
  });
});
