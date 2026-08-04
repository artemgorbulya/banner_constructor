import { describe, it, expect } from 'vitest';
import { PRESETS, computeDeviceFrames } from '../../lib/presets';

// ─── PRESETS structure ────────────────────────────────────────────────────────

describe('PRESETS', () => {
  it('contains exactly 3 presets', () => {
    expect(PRESETS).toHaveLength(3);
  });

  it('each preset has required fields', () => {
    for (const p of PRESETS) {
      expect(p).toHaveProperty('label');
      expect(p).toHaveProperty('width');
      expect(p).toHaveProperty('height');
      expect(p.margins).toMatchObject({ top: expect.any(Number), right: expect.any(Number), bottom: expect.any(Number), left: expect.any(Number) });
      expect(['wide', 'tall', 'stacked']).toContain(p.deviceFramesLayout);
    }
  });

  it('Billboard preset is 1536×256 with wide layout', () => {
    const p = PRESETS.find(p => p.label === 'Billboard');
    expect(p).toBeDefined();
    expect(p.width).toBe(1536);
    expect(p.height).toBe(256);
    expect(p.deviceFramesLayout).toBe('wide');
  });

  it('Web Banner preset is 880×408 with tall layout', () => {
    const p = PRESETS.find(p => p.label === 'Web Banner');
    expect(p).toBeDefined();
    expect(p.width).toBe(880);
    expect(p.height).toBe(408);
    expect(p.deviceFramesLayout).toBe('tall');
  });

  it('Promo Banner preset is 700×465 with stacked layout and correct margins', () => {
    const p = PRESETS.find(p => p.label === 'Promo Banner');
    expect(p).toBeDefined();
    expect(p.width).toBe(700);
    expect(p.height).toBe(465);
    expect(p.deviceFramesLayout).toBe('stacked');
    expect(p.margins).toEqual({ top: 36, right: 43, bottom: 30, left: 20 });
  });
});

// ─── computeDeviceFrames ──────────────────────────────────────────────────────

describe('computeDeviceFrames — wide layout (Billboard 1536×256)', () => {
  const canvas = { width: 1536, height: 256 };
  const margins = { top: 16, right: 176, bottom: 30, left: 176 };

  it('both frames have the same y (side by side)', () => {
    const { frame1, frame2 } = computeDeviceFrames(canvas, margins);
    expect(frame1.y).toBe(frame2.y);
  });

  it('frames are vertically centered in the canvas', () => {
    const { frame1, size } = computeDeviceFrames(canvas, margins);
    expect(frame1.y).toBe(Math.round((canvas.height - size) / 2));
  });

  it('frame2 is 20px to the left of frame1', () => {
    const { frame1, frame2, size } = computeDeviceFrames(canvas, margins);
    expect(frame1.x - frame2.x).toBe(size + 20);
  });

  it('frame1 right edge is flush with right safe area boundary', () => {
    const { frame1, size } = computeDeviceFrames(canvas, margins);
    expect(frame1.x + size).toBe(canvas.width - margins.right);
  });
});

describe('computeDeviceFrames — tall layout (Web Banner 880×408)', () => {
  const canvas = { width: 880, height: 408 };
  const margins = { top: 24, right: 32, bottom: 48, left: 32 };

  it('both frames share the same x (stacked vertically)', () => {
    const { frame1, frame2 } = computeDeviceFrames(canvas, margins);
    expect(frame1.x).toBe(frame2.x);
  });

  it('frame1 top aligns with safe area top', () => {
    const { frame1 } = computeDeviceFrames(canvas, margins);
    expect(frame1.y).toBe(margins.top);
  });

  it('frame2 bottom aligns with safe area bottom', () => {
    const { frame2, size } = computeDeviceFrames(canvas, margins);
    expect(frame2.y + size).toBe(canvas.height - margins.bottom);
  });

  it('frame1 right edge is flush with right safe area boundary', () => {
    const { frame1, size } = computeDeviceFrames(canvas, margins);
    expect(frame1.x + size).toBe(canvas.width - margins.right);
  });
});

describe('computeDeviceFrames — stacked layout (Promo Banner 700×465)', () => {
  const canvas = { width: 700, height: 465 };
  const margins = { top: 36, right: 43, bottom: 30, left: 20 };

  it('both frames share the same x', () => {
    const { frame1, frame2 } = computeDeviceFrames(canvas, margins);
    expect(frame1.x).toBe(frame2.x);
  });

  it('frame1 right edge is flush with right safe area boundary', () => {
    const { frame1, size } = computeDeviceFrames(canvas, margins);
    expect(frame1.x + size).toBe(canvas.width - margins.right);
  });

  it('frame1 y is 20px below safe area top', () => {
    const { frame1 } = computeDeviceFrames(canvas, margins);
    expect(frame1.y).toBe(margins.top + 20);
  });

  it('frame2 y is 8px below the bottom of frame1', () => {
    const { frame1, frame2, size } = computeDeviceFrames(canvas, margins);
    expect(frame2.y).toBe(frame1.y + size + 8);
  });

  it('both frames are within the canvas height', () => {
    const { frame2, size } = computeDeviceFrames(canvas, margins);
    expect(frame2.y + size).toBeLessThanOrEqual(canvas.height);
  });
});

describe('computeDeviceFrames — custom canvas fallback', () => {
  it('canvas width > 1200 with no preset match uses wide layout', () => {
    const canvas = { width: 1400, height: 400 };
    const margins = { top: 20, right: 20, bottom: 20, left: 20 };
    const { frame1, frame2, size } = computeDeviceFrames(canvas, margins);
    // wide: same y, centered
    expect(frame1.y).toBe(frame2.y);
    expect(frame1.y).toBe(Math.round((canvas.height - size) / 2));
  });

  it('canvas width ≤ 1200 with no preset match uses tall layout', () => {
    const canvas = { width: 1000, height: 500 };
    const margins = { top: 30, right: 30, bottom: 30, left: 30 };
    const { frame1, frame2 } = computeDeviceFrames(canvas, margins);
    // tall: frame1 at safe area top
    expect(frame1.y).toBe(margins.top);
    expect(frame1.x).toBe(frame2.x);
  });
});
