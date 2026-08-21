import { describe, it, expect } from 'vitest';
import reducer, {
  addElement, prependElement, updateElement, updateElementWithHistory,
  deleteElement, reorderLayers,
  undoHistory, redoHistory,
  setCanvasSizeAndScale, setCanvasSizeAndClear,
  setBackground, setBackgroundWithHistory,
  setBackgroundImage, clearBackgroundImage,
  toggleSafeArea, toggleLogoFrame, toggleDeviceFrames,
  setSafeAreaMargins, setSelectedId,
  resetProject, loadProject, bumpRegistryVersion,
} from '../../store/editorSlice';

const initialState = reducer(undefined, { type: '@@INIT' });

function state(overrides = {}) {
  return { ...initialState, ...overrides };
}

// ─── History ─────────────────────────────────────────────────────────────────

describe('undoHistory', () => {
  it('does nothing on empty past stack', () => {
    const s = state();
    const next = reducer(s, undoHistory());
    expect(next.history.past).toHaveLength(0);
    expect(next.elements).toEqual([]);
  });

  it('restores previous state after addElement', () => {
    let s = state();
    s = reducer(s, addElement({ type: 'text', x: 10, y: 20, width: 100 }));
    expect(s.elements).toHaveLength(1);

    s = reducer(s, undoHistory());
    expect(s.elements).toHaveLength(0);
    expect(s.history.future).toHaveLength(1);
  });

  it('clears selectedId if undone element no longer exists', () => {
    let s = state();
    s = reducer(s, addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    const addedId = s.selectedId;
    s = reducer(s, setSelectedId(addedId));
    s = reducer(s, undoHistory());
    expect(s.selectedId).toBeNull();
  });

  it('does not clear selectedId if element still exists after undo', () => {
    let s = state();
    s = reducer(s, addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    const id1 = s.selectedId;
    s = reducer(s, addElement({ type: 'text', x: 10, y: 0, width: 100 }));
    s = reducer(s, setSelectedId(id1));
    s = reducer(s, undoHistory());
    // id1 was added before the snapshot, so it still exists
    expect(s.selectedId).toBe(id1);
  });
});

describe('redoHistory', () => {
  it('does nothing on empty future stack', () => {
    const s = state();
    const next = reducer(s, redoHistory());
    expect(next.history.future).toHaveLength(0);
  });

  it('restores element after undo+redo', () => {
    let s = state();
    s = reducer(s, addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    s = reducer(s, undoHistory());
    expect(s.elements).toHaveLength(0);
    s = reducer(s, redoHistory());
    expect(s.elements).toHaveLength(1);
    expect(s.history.future).toHaveLength(0);
  });
});

describe('history stack cap', () => {
  it('caps history at 50 entries', () => {
    let s = state();
    for (let i = 0; i < 55; i++) {
      s = reducer(s, addElement({ type: 'text', x: i, y: 0, width: 100 }));
    }
    expect(s.history.past.length).toBeLessThanOrEqual(50);
  });
});

// ─── Elements CRUD ───────────────────────────────────────────────────────────

describe('addElement', () => {
  it('adds element with defaults and sets selectedId', () => {
    const s = reducer(state(), addElement({ type: 'text', x: 5, y: 10, width: 200 }));
    expect(s.elements).toHaveLength(1);
    expect(s.elements[0].visible).toBe(true);
    expect(s.elements[0].rotation).toBe(0);
    expect(s.elements[0].opacity).toBe(1);
    expect(s.elements[0].id).toBeTruthy();
    expect(s.selectedId).toBe(s.elements[0].id);
  });

  it('payload fields override defaults', () => {
    const s = reducer(state(), addElement({ type: 'image', x: 0, y: 0, width: 100, opacity: 0.5 }));
    expect(s.elements[0].opacity).toBe(0.5);
  });

  it('records history entry', () => {
    const s = reducer(state(), addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    expect(s.history.past).toHaveLength(1);
  });
});

describe('prependElement', () => {
  it('inserts element at beginning of array', () => {
    let s = reducer(state(), addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    s = reducer(s, prependElement({ type: 'image', x: 0, y: 0, width: 50, height: 50 }));
    expect(s.elements[0].type).toBe('image');
    expect(s.elements[1].type).toBe('text');
  });
});

describe('updateElement', () => {
  it('mutates element without writing to history', () => {
    let s = reducer(state(), addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    const id = s.elements[0].id;
    const histLen = s.history.past.length;
    s = reducer(s, updateElement({ id, x: 99 }));
    expect(s.elements[0].x).toBe(99);
    expect(s.history.past.length).toBe(histLen); // no new history entry
  });

  it('ignores unknown id gracefully', () => {
    const s = state();
    expect(() => reducer(s, updateElement({ id: 'no-such-id', x: 5 }))).not.toThrow();
  });
});

describe('updateElementWithHistory', () => {
  it('updates element and writes to history', () => {
    let s = reducer(state(), addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    const id = s.elements[0].id;
    const histLen = s.history.past.length;
    s = reducer(s, updateElementWithHistory({ id, x: 77 }));
    expect(s.elements[0].x).toBe(77);
    expect(s.history.past.length).toBe(histLen + 1);
  });

  it('still pushes snapshot even when id not found (documented behaviour)', () => {
    let s = reducer(state(), addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    const histLen = s.history.past.length;
    s = reducer(s, updateElementWithHistory({ id: 'ghost-id', x: 5 }));
    // Bug: history is polluted even though no element was changed
    expect(s.history.past.length).toBe(histLen + 1);
  });
});

describe('deleteElement', () => {
  it('removes element and clears selectedId', () => {
    let s = reducer(state(), addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    const id = s.elements[0].id;
    s = reducer(s, deleteElement(id));
    expect(s.elements).toHaveLength(0);
    expect(s.selectedId).toBeNull();
  });

  it('does not clear selectedId if deleted element is not selected', () => {
    let s = reducer(state(), addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    const id1 = s.elements[0].id;
    s = reducer(s, addElement({ type: 'text', x: 10, y: 0, width: 100 }));
    s = reducer(s, setSelectedId(id1));
    const id2 = s.elements[1].id;
    s = reducer(s, deleteElement(id2));
    expect(s.selectedId).toBe(id1);
  });
});

describe('reorderLayers', () => {
  it('moves element from one index to another', () => {
    let s = state();
    s = reducer(s, addElement({ type: 'text', x: 0, y: 0, width: 100, text: 'A' }));
    s = reducer(s, addElement({ type: 'text', x: 0, y: 0, width: 100, text: 'B' }));
    s = reducer(s, addElement({ type: 'text', x: 0, y: 0, width: 100, text: 'C' }));
    s = reducer(s, reorderLayers({ fromIndex: 0, toIndex: 2 }));
    expect(s.elements[2].text).toBe('A');
    expect(s.history.past.length).toBeGreaterThan(0);
  });
});

// ─── Canvas sizing ────────────────────────────────────────────────────────────

describe('setCanvasSizeAndScale', () => {
  it('scales element positions proportionally, keeps dimensions unchanged', () => {
    let s = state();
    // Canvas is 880×408; add image at (440, 204) with 100×50
    s = reducer(s, addElement({ type: 'image', x: 440, y: 204, width: 100, height: 50 }));
    s = reducer(s, setCanvasSizeAndScale({ width: 1760, height: 816 }));
    const el = s.elements[0];
    expect(el.x).toBe(880); // 440 * 2
    expect(el.y).toBe(408); // 204 * 2
    expect(el.width).toBe(100); // unchanged
    expect(el.height).toBe(50); // unchanged
  });

  it('handles text element (no height) without throwing', () => {
    let s = state();
    s = reducer(s, addElement({ type: 'text', x: 100, y: 100, width: 200 }));
    expect(() => reducer(s, setCanvasSizeAndScale({ width: 440, height: 204 }))).not.toThrow();
  });

  it('clamps element position to canvas bounds', () => {
    let s = state();
    // Element near right edge; scaling down should clamp x
    s = reducer(s, addElement({ type: 'image', x: 800, y: 0, width: 100, height: 50 }));
    s = reducer(s, setCanvasSizeAndScale({ width: 440, height: 204 }));
    const el = s.elements[0];
    expect(el.x).toBeGreaterThanOrEqual(0);
    expect(el.x).toBeLessThanOrEqual(440 - 100); // clamped to (width - elW)
  });

  it('re-centers backgroundImage on new canvas, keeps its dimensions', () => {
    let s = state();
    s = reducer(s, setBackgroundImage({ src: 'img.png', x: 0, y: 0, width: 400, height: 200, rotation: 0 }));
    s = reducer(s, setCanvasSizeAndScale({ width: 1760, height: 816 }));
    expect(s.backgroundImage.x).toBe(Math.round((1760 - 400) / 2));
    expect(s.backgroundImage.y).toBe(Math.round((816 - 200) / 2));
    expect(s.backgroundImage.width).toBe(400); // unchanged
  });

  it('clears selectedId', () => {
    let s = reducer(state(), addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    s = reducer(s, setCanvasSizeAndScale({ width: 440, height: 204 }));
    expect(s.selectedId).toBeNull();
  });
});

describe('setCanvasSizeAndClear', () => {
  it('clears all elements and resets background', () => {
    let s = reducer(state(), addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    s = reducer(s, setCanvasSizeAndClear({ width: 500, height: 300 }));
    expect(s.elements).toHaveLength(0);
    expect(s.canvasSize).toEqual({ width: 500, height: 300 });
    expect(s.background.color).toBe('#ffffff');
    expect(s.backgroundImage.src).toBeNull();
    expect(s.selectedId).toBeNull();
  });

  it('stores explicit deviceFramesLayout from payload', () => {
    const s = reducer(state(), setCanvasSizeAndClear({ width: 700, height: 465, deviceFramesLayout: 'stacked' }));
    expect(s.deviceFramesLayout).toBe('stacked');
  });

  it('computes wide layout when width > 1200 and no explicit layout', () => {
    const s = reducer(state(), setCanvasSizeAndClear({ width: 1536, height: 256 }));
    expect(s.deviceFramesLayout).toBe('wide');
  });

  it('computes tall layout when width ≤ 1200 and no explicit layout', () => {
    const s = reducer(state(), setCanvasSizeAndClear({ width: 700, height: 465 }));
    expect(s.deviceFramesLayout).toBe('tall');
  });
});

describe('setCanvasSizeAndScale — deviceFramesLayout', () => {
  it('stores explicit deviceFramesLayout from payload', () => {
    const s = reducer(state(), setCanvasSizeAndScale({ width: 700, height: 465, deviceFramesLayout: 'stacked' }));
    expect(s.deviceFramesLayout).toBe('stacked');
  });

  it('computes layout from width when not provided', () => {
    const s = reducer(state(), setCanvasSizeAndScale({ width: 1400, height: 400 }));
    expect(s.deviceFramesLayout).toBe('wide');
  });
});

// ─── Background ──────────────────────────────────────────────────────────────

describe('setBackground / setBackgroundWithHistory', () => {
  it('setBackground does not write history', () => {
    const s = state();
    const next = reducer(s, setBackground({ color: '#ff0000' }));
    expect(next.background.color).toBe('#ff0000');
    expect(next.history.past).toHaveLength(0);
  });

  it('setBackgroundWithHistory writes history', () => {
    const s = state();
    const next = reducer(s, setBackgroundWithHistory({ color: '#ff0000' }));
    expect(next.background.color).toBe('#ff0000');
    expect(next.history.past).toHaveLength(1);
  });
});

describe('clearBackgroundImage', () => {
  it('resets backgroundImage to default', () => {
    let s = reducer(state(), setBackgroundImage({ src: 'x.png', x: 10, y: 10, width: 200, height: 100, rotation: 0 }));
    s = reducer(s, clearBackgroundImage());
    expect(s.backgroundImage.src).toBeNull();
  });

  it('clears selectedId if background was selected', () => {
    let s = state();
    s = reducer(s, setBackgroundImage({ src: 'x.png', x: 0, y: 0, width: 100, height: 100, rotation: 0 }));
    s = reducer(s, setSelectedId('__bg_image__'));
    s = reducer(s, clearBackgroundImage());
    expect(s.selectedId).toBeNull();
  });
});

// ─── Toggles ─────────────────────────────────────────────────────────────────

describe('toggles', () => {
  it('toggleSafeArea flips safeAreaEnabled', () => {
    const s = state();
    expect(s.safeAreaEnabled).toBe(true);
    const next = reducer(s, toggleSafeArea());
    expect(next.safeAreaEnabled).toBe(false);
    expect(reducer(next, toggleSafeArea()).safeAreaEnabled).toBe(true);
  });

  it('toggleLogoFrame flips logoFrameEnabled', () => {
    const s = state();
    expect(s.logoFrameEnabled).toBe(true);
    expect(reducer(s, toggleLogoFrame()).logoFrameEnabled).toBe(false);
  });

  it('toggleDeviceFrames flips deviceFramesEnabled', () => {
    const s = state();
    expect(s.deviceFramesEnabled).toBe(true);
    expect(reducer(s, toggleDeviceFrames()).deviceFramesEnabled).toBe(false);
  });
});

// ─── loadProject ─────────────────────────────────────────────────────────────

describe('loadProject', () => {
  const fullPayload = {
    canvasSize: { width: 1536, height: 256 },
    background: { color: '#123456' },
    backgroundImage: { src: 'bg.png', x: 0, y: 0, width: 500, height: 200, rotation: 0 },
    elements: [{ id: 'e1', type: 'text', x: 10, y: 10, width: 100 }],
    safeAreaMargins: { top: 10, right: 20, bottom: 30, left: 40 },
  };

  it('restores all fields and clears history', () => {
    let s = reducer(state(), addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    s = reducer(s, loadProject(fullPayload));
    expect(s.canvasSize).toEqual({ width: 1536, height: 256 });
    expect(s.background.color).toBe('#123456');
    expect(s.elements).toHaveLength(1);
    expect(s.safeAreaMargins).toEqual({ top: 10, right: 20, bottom: 30, left: 40 });
    expect(s.selectedId).toBeNull();
    expect(s.history.past).toHaveLength(0);
    expect(s.history.future).toHaveLength(0);
  });

  it('falls back for missing background', () => {
    const s = reducer(state(), loadProject({ canvasSize: { width: 880, height: 408 }, elements: [] }));
    expect(s.background).toEqual({ color: '#ffffff' });
  });

  it('falls back for missing backgroundImage', () => {
    const s = reducer(state(), loadProject({ canvasSize: { width: 880, height: 408 }, elements: [] }));
    expect(s.backgroundImage.src).toBeNull();
  });

  it('falls back for missing safeAreaMargins', () => {
    const s = reducer(state(), loadProject({ canvasSize: { width: 880, height: 408 }, elements: [] }));
    expect(s.safeAreaMargins).toEqual({ top: 24, right: 32, bottom: 48, left: 32 });
  });

  it('falls back for missing elements', () => {
    const s = reducer(state(), loadProject({ canvasSize: { width: 880, height: 408 } }));
    expect(s.elements).toEqual([]);
  });

  it('restores deviceFramesLayout when explicitly saved', () => {
    const s = reducer(state(), loadProject({ canvasSize: { width: 700, height: 465 }, elements: [], deviceFramesLayout: 'stacked' }));
    expect(s.deviceFramesLayout).toBe('stacked');
  });

  it('falls back to width-based heuristic (no preset lookup) for old projects without saved layout', () => {
    // 700×465 previously fell into the non-wide fallback ('tall') before Promo Banner preset existed
    const s = reducer(state(), loadProject({ canvasSize: { width: 700, height: 465 }, elements: [] }));
    expect(s.deviceFramesLayout).toBe('tall');
  });

  it('falls back to wide for old projects with width > 1200', () => {
    const s = reducer(state(), loadProject({ canvasSize: { width: 1536, height: 256 }, elements: [] }));
    expect(s.deviceFramesLayout).toBe('wide');
  });
});

// ─── resetProject ─────────────────────────────────────────────────────────────

describe('resetProject', () => {
  it('resets everything to initial state', () => {
    let s = reducer(state(), addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    s = reducer(s, setBackground({ color: '#ff0000' }));
    s = reducer(s, resetProject());
    expect(s.elements).toHaveLength(0);
    expect(s.background.color).toBe('#ffffff');
    expect(s.canvasSize).toEqual({ width: 880, height: 408 });
    expect(s.history.past).toHaveLength(0);
  });
});

// ─── setSafeAreaMargins ───────────────────────────────────────────────────────

describe('setSafeAreaMargins', () => {
  it('partially updates margins', () => {
    const s = reducer(state(), setSafeAreaMargins({ top: 99 }));
    expect(s.safeAreaMargins.top).toBe(99);
    expect(s.safeAreaMargins.right).toBe(32); // unchanged
  });
});

// ─── bumpRegistryVersion ──────────────────────────────────────────────────────

describe('bumpRegistryVersion', () => {
  it('increments registryVersion by 1 each call', () => {
    let s = state();
    expect(s.registryVersion).toBe(0);
    s = reducer(s, bumpRegistryVersion());
    expect(s.registryVersion).toBe(1);
    s = reducer(s, bumpRegistryVersion());
    expect(s.registryVersion).toBe(2);
  });

  it('registryVersion is not included in undo/redo snapshots', () => {
    let s = reducer(state(), bumpRegistryVersion());
    expect(s.registryVersion).toBe(1);
    // add element to create a history entry, then undo
    s = reducer(s, addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    s = reducer(s, undoHistory());
    // undo restores elements but must not reset registryVersion
    expect(s.registryVersion).toBe(1);
  });

  it('resetProject resets registryVersion to 0', () => {
    let s = reducer(state(), bumpRegistryVersion());
    s = reducer(s, resetProject());
    expect(s.registryVersion).toBe(0);
  });
});

// ─── loadProject — single layout ─────────────────────────────────────────────

describe('loadProject — single layout', () => {
  it('restores deviceFramesLayout: single when explicitly saved', () => {
    const s = reducer(state(), loadProject({ canvasSize: { width: 780, height: 130 }, elements: [], deviceFramesLayout: 'single' }));
    expect(s.deviceFramesLayout).toBe('single');
  });

  it('falls back to tall heuristic for old 780×130 projects without saved layout', () => {
    // width 780 ≤ 1200 → heuristic gives 'tall', not 'single'
    const s = reducer(state(), loadProject({ canvasSize: { width: 780, height: 130 }, elements: [] }));
    expect(s.deviceFramesLayout).toBe('tall');
  });
});
