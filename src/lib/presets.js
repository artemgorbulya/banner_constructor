export const PRESETS = [
  { label: 'Billboard',   width: 1536, height: 256, margins: { top: 16, right: 176, bottom: 30, left: 176 }, deviceFramesLayout: 'wide' },
  { label: 'Web Banner',  width: 880,  height: 408, margins: { top: 24, right: 32,  bottom: 48, left: 32  }, deviceFramesLayout: 'tall' },
  { label: 'Promo Banner',width: 700,  height: 465, margins: { top: 36, right: 43,  bottom: 30, left: 20  }, deviceFramesLayout: 'stacked' },
];

const DEVICE_SIZE = 160;

/**
 * Returns pixel coordinates for both device frames given canvas dimensions and safe area margins.
 * Layout is determined by the matching preset's deviceFramesLayout field;
 * custom canvas sizes fall back to 'wide' (>1200px) or 'tall'.
 */
export function computeDeviceFrames(canvasSize, safeAreaMargins) {
  const rightX = canvasSize.width - safeAreaMargins.right - DEVICE_SIZE;
  const preset = PRESETS.find(p => p.width === canvasSize.width && p.height === canvasSize.height);
  const layout = preset?.deviceFramesLayout ?? (canvasSize.width > 1200 ? 'wide' : 'tall');

  let x1 = rightX, y1, x2 = rightX, y2;

  if (layout === 'wide') {
    y1 = Math.round((canvasSize.height - DEVICE_SIZE) / 2);
    y2 = y1;
    x2 = rightX - 20 - DEVICE_SIZE;
  } else if (layout === 'stacked') {
    y1 = safeAreaMargins.top + 20;
    y2 = y1 + DEVICE_SIZE + 8;
  } else {
    // 'tall'
    y1 = safeAreaMargins.top;
    y2 = canvasSize.height - safeAreaMargins.bottom - DEVICE_SIZE;
  }

  return { frame1: { x: x1, y: y1 }, frame2: { x: x2, y: y2 }, size: DEVICE_SIZE };
}
