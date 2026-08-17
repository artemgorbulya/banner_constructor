export const PRESETS = [
  { label: 'Billboard',   width: 1536, height: 256, margins: { top: 16, right: 176, bottom: 30, left: 176 }, deviceFramesLayout: 'wide' },
  { label: 'Web Banner',  width: 880,  height: 408, margins: { top: 24, right: 32,  bottom: 48, left: 32  }, deviceFramesLayout: 'tall' },
  { label: 'Promo Banner',width: 700,  height: 465, margins: { top: 36, right: 43,  bottom: 30, left: 20  }, deviceFramesLayout: 'stacked' },
];

const DEVICE_SIZE = 160;

/**
 * Returns pixel coordinates for both device frames given canvas dimensions and safe area margins.
 * Pass an explicit `layout` (from Redux state) to avoid ambiguity when canvas dimensions match a
 * preset that was added after the project was created. Falls back to preset lookup, then heuristic.
 */
export function computeDeviceFrames(canvasSize, safeAreaMargins, layout) {
  const rightX = canvasSize.width - safeAreaMargins.right - DEVICE_SIZE;
  const resolvedLayout = layout ?? (() => {
    const preset = PRESETS.find(p => p.width === canvasSize.width && p.height === canvasSize.height);
    return preset?.deviceFramesLayout ?? (canvasSize.width > 1200 ? 'wide' : 'tall');
  })();

  let x1 = rightX, y1, x2 = rightX, y2;

  if (resolvedLayout === 'wide') {
    y1 = Math.round((canvasSize.height - DEVICE_SIZE) / 2);
    y2 = y1;
    x2 = rightX - 20 - DEVICE_SIZE;
  } else if (resolvedLayout === 'stacked') {
    y1 = safeAreaMargins.top + 20;
    y2 = y1 + DEVICE_SIZE + 8;
  } else {
    // 'tall'
    y1 = safeAreaMargins.top;
    y2 = canvasSize.height - safeAreaMargins.bottom - DEVICE_SIZE;
  }

  return { frame1: { x: x1, y: y1 }, frame2: { x: x2, y: y2 }, size: DEVICE_SIZE };
}
