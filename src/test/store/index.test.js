import { describe, it, expect, beforeEach, vi } from 'vitest';

// store/index.js reads localStorage once at import time — re-import per test
async function loadStore() {
  vi.resetModules();
  const { store } = await import('../../store/index.js');
  return store.getState().editor;
}

const saved = {
  canvasSize: { width: 1536, height: 256 },
  background: { color: '#123456' },
  backgroundImage: { src: 'img_1', x: 1, y: 2, width: 3, height: 4, rotation: 0 },
  elements: [{ id: 'e1', type: 'text', text: 'Hi', x: 0, y: 0, width: 100 }],
  safeAreaMargins: { top: 16, right: 176, bottom: 30, left: 176 },
};

describe('store preloaded state from localStorage', () => {
  beforeEach(() => { localStorage.clear(); });

  it('uses default state when nothing is saved', async () => {
    const s = await loadStore();
    expect(s.canvasSize).toEqual({ width: 880, height: 408 });
    expect(s.elements).toEqual([]);
    expect(s.deviceFramesLayout).toBe('tall');
    expect(s.registryVersion).toBe(0);
  });

  it('restores the saved project from banner_project_v2', async () => {
    localStorage.setItem('banner_project_v2', JSON.stringify(saved));
    const s = await loadStore();
    expect(s.canvasSize).toEqual(saved.canvasSize);
    expect(s.background).toEqual(saved.background);
    expect(s.backgroundImage).toEqual(saved.backgroundImage);
    expect(s.elements).toEqual(saved.elements);
    expect(s.safeAreaMargins).toEqual(saved.safeAreaMargins);
  });

  it('resets UI state on restore: no selection, empty history, toggles on', async () => {
    localStorage.setItem('banner_project_v2', JSON.stringify({ ...saved, selectedId: 'e1' }));
    const s = await loadStore();
    expect(s.selectedId).toBeNull();
    expect(s.history).toEqual({ past: [], future: [] });
    expect(s.snapEnabled).toBe(true);
    expect(s.keepRatio).toBe(true);
    expect(s.safeAreaEnabled).toBe(true);
  });

  it('restores deviceFramesLayout from the save (custom size keeps its layout)', async () => {
    localStorage.setItem('banner_project_v2', JSON.stringify({
      canvasSize: { width: 900, height: 500 }, elements: [], deviceFramesLayout: 'stacked',
    }));
    const s = await loadStore();
    expect(s.deviceFramesLayout).toBe('stacked');
  });

  it.each([
    [{ width: 700, height: 465 }, 'tall'],
    [{ width: 1536, height: 256 }, 'wide'],
    [{ width: 1201, height: 300 }, 'wide'],
    [{ width: 1200, height: 300 }, 'tall'],
  ])('older saves without deviceFramesLayout use the width fallback (%o → %s)', async (canvasSize, expected) => {
    localStorage.setItem('banner_project_v2', JSON.stringify({ canvasSize, elements: [] }));
    const s = await loadStore();
    expect(s.deviceFramesLayout).toBe(expected);
  });

  it('reload restore gives the same state as opening the project via loadProject', async () => {
    const legacy = { canvasSize: { width: 700, height: 465 }, elements: saved.elements };
    localStorage.setItem('banner_project_v2', JSON.stringify(legacy));
    const restored = await loadStore();
    const { default: reducer, loadProject } = await import('../../store/editorSlice.js');
    expect(restored).toEqual(reducer(undefined, loadProject(legacy)));
  });

  it('initialises registryVersion to 0 so bumpRegistryVersion yields a number', async () => {
    localStorage.setItem('banner_project_v2', JSON.stringify(saved));
    vi.resetModules();
    const { store } = await import('../../store/index.js');
    const { bumpRegistryVersion } = await import('../../store/editorSlice.js');
    expect(store.getState().editor.registryVersion).toBe(0);
    store.dispatch(bumpRegistryVersion());
    expect(store.getState().editor.registryVersion).toBe(1);
  });

  it('restored state has exactly the same keys as a fresh state', async () => {
    const fresh = await loadStore();
    localStorage.setItem('banner_project_v2', JSON.stringify(saved));
    const restored = await loadStore();
    expect(Object.keys(restored).sort()).toEqual(Object.keys(fresh).sort());
  });

  it('undo after reload keeps the restored deviceFramesLayout', async () => {
    localStorage.setItem('banner_project_v2', JSON.stringify({ ...saved, canvasSize: { width: 700, height: 465 }, deviceFramesLayout: 'stacked' }));
    vi.resetModules();
    const { store } = await import('../../store/index.js');
    const { pushHistory, setBackground, undoHistory } = await import('../../store/editorSlice.js');
    store.dispatch(pushHistory());
    store.dispatch(setBackground({ color: '#000000' }));
    store.dispatch(undoHistory());
    expect(store.getState().editor.deviceFramesLayout).toBe('stacked');
  });

  it('falls back to legacy banner_project_v1 key', async () => {
    localStorage.setItem('banner_project_v1', JSON.stringify(saved));
    const s = await loadStore();
    expect(s.canvasSize).toEqual(saved.canvasSize);
  });

  it('prefers v2 over v1', async () => {
    localStorage.setItem('banner_project_v1', JSON.stringify({ ...saved, canvasSize: { width: 1, height: 1 } }));
    localStorage.setItem('banner_project_v2', JSON.stringify(saved));
    const s = await loadStore();
    expect(s.canvasSize).toEqual(saved.canvasSize);
  });

  it('fills defaults for fields missing in older saves', async () => {
    localStorage.setItem('banner_project_v2', JSON.stringify({ canvasSize: { width: 880, height: 408 }, elements: [] }));
    const s = await loadStore();
    expect(s.background).toEqual({ color: '#ffffff' });
    expect(s.backgroundImage).toEqual({ src: null, x: 0, y: 0, width: 0, height: 0, rotation: 0 });
    expect(s.safeAreaMargins).toEqual({ top: 24, right: 32, bottom: 48, left: 32 });
  });

  it.each([
    ['invalid JSON', '{not json'],
    ['missing canvasSize', JSON.stringify({ elements: [] })],
    ['elements not an array', JSON.stringify({ canvasSize: { width: 1, height: 1 }, elements: {} })],
    ['null', 'null'],
  ])('ignores corrupted save (%s) and uses defaults', async (_, raw) => {
    localStorage.setItem('banner_project_v2', raw);
    const s = await loadStore();
    expect(s.canvasSize).toEqual({ width: 880, height: 408 });
    expect(s.elements).toEqual([]);
  });

  it('does not throw when localStorage access throws', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    const s = await loadStore();
    expect(s.canvasSize).toEqual({ width: 880, height: 408 });
    spy.mockRestore();
  });

  it('removes API keys of deleted features (Gemini, remove.bg) on startup', async () => {
    localStorage.setItem('gemini_api_key', 'AIza-secret');
    localStorage.setItem('removebg_api_key', 'rbg-secret');
    localStorage.setItem('banner_project_v2', JSON.stringify(saved));
    await loadStore();
    expect(localStorage.getItem('gemini_api_key')).toBeNull();
    expect(localStorage.getItem('removebg_api_key')).toBeNull();
    expect(localStorage.getItem('banner_project_v2')).not.toBeNull();
  });
});
