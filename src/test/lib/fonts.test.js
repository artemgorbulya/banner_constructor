import { describe, it, expect, beforeEach, vi } from 'vitest';

// fonts.js has module-level side effects (pre-warming LOCAL_FONTS),
// so we reset modules before each test to get a clean loadedFonts set.
beforeEach(() => {
  vi.resetModules();
});

describe('loadFont', () => {
  it('resolves immediately for already-loaded fonts (deduplicated)', async () => {
    const fontsMock = { load: vi.fn().mockResolvedValue([]) };
    vi.stubGlobal('document', { ...document, fonts: fontsMock });

    const { loadFont } = await import('../../lib/fonts.js');
    const p1 = loadFont('Arial');
    const p2 = loadFont('Arial');
    expect(p1).toBe(p2); // same promise returned (dedup)
    await p1;
    // After resolution, second call returns immediately
    const p3 = loadFont('Arial');
    await expect(p3).resolves.toBeUndefined();
    // load was called only once during the first two calls
    expect(fontsMock.load).toHaveBeenCalledTimes(1 + 5); // 5 LOCAL_FONTS + 1 Arial
  });

  it('resolves immediately for built-in fonts (sans-serif, serif, monospace)', async () => {
    const fontsMock = { load: vi.fn().mockResolvedValue([]) };
    vi.stubGlobal('document', { ...document, fonts: fontsMock });
    const { loadFont } = await import('../../lib/fonts.js');
    const callsBefore = fontsMock.load.mock.calls.length;
    await loadFont('sans-serif');
    // No extra call — sans-serif is pre-seeded in loadedFonts
    expect(fontsMock.load.mock.calls.length).toBe(callsBefore);
  });

  it('marks font as loaded even when document.fonts.load rejects', async () => {
    const fontsMock = { load: vi.fn().mockRejectedValue(new Error('font not found')) };
    vi.stubGlobal('document', { ...document, fonts: fontsMock });
    const { loadFont } = await import('../../lib/fonts.js');

    // Wait for LOCAL_FONTS pre-warming to settle
    await new Promise(r => setTimeout(r, 10));

    const p = loadFont('NonExistentFont');
    await expect(p).resolves.toBeUndefined(); // does not reject

    // Now second call should return immediately (cached)
    const calls = fontsMock.load.mock.calls.length;
    await loadFont('NonExistentFont');
    expect(fontsMock.load.mock.calls.length).toBe(calls);
  });
});
