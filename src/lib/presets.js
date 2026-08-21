export const PRESETS = [
  { label: 'Billboard',   width: 1536, height: 256, margins: { top: 16, right: 176, bottom: 30, left: 176 }, deviceFramesLayout: 'wide' },
  { label: 'Slim Banner', width: 1600, height: 200, margins: { top: 20, right: 89,  bottom: 20, left: 90  }, deviceFramesLayout: 'wide' },
  { label: 'Super Slim',  width: 780,  height: 130, margins: { top: 14, right: 34,  bottom: 14, left: 34  }, deviceFramesLayout: 'single', logoFrameSize: { width: 155, height: 50 }, deviceSize: 124 },
  { label: 'Web Banner',  width: 880,  height: 408, margins: { top: 24, right: 32,  bottom: 48, left: 32  }, deviceFramesLayout: 'tall' },
  { label: 'Promo Banner',width: 700,  height: 465, margins: { top: 36, right: 43,  bottom: 30, left: 20  }, deviceFramesLayout: 'stacked' },
];

const DEVICE_SIZE = 160;

export function computeDeviceFrames(canvasSize, safeAreaMargins, layout, deviceSize = DEVICE_SIZE) {
  const rightX = canvasSize.width - safeAreaMargins.right - deviceSize;
  const resolvedLayout = layout ?? (() => {
    const preset = PRESETS.find(p => p.width === canvasSize.width && p.height === canvasSize.height);
    return preset?.deviceFramesLayout ?? (canvasSize.width > 1200 ? 'wide' : 'tall');
  })();

  let x1 = rightX, y1, x2 = rightX, y2;

  if (resolvedLayout === 'single') {
    const safeH = canvasSize.height - safeAreaMargins.top - safeAreaMargins.bottom;
    y1 = safeAreaMargins.top + Math.round((safeH - deviceSize) / 2);
    return { frame1: { x: x1, y: y1 }, frame2: null, size: deviceSize };
  } else if (resolvedLayout === 'wide') {
    y1 = Math.round((canvasSize.height - deviceSize) / 2);
    y2 = y1;
    x2 = rightX - 20 - deviceSize;
  } else if (resolvedLayout === 'stacked') {
    y1 = safeAreaMargins.top + 20;
    y2 = y1 + deviceSize + 8;
  } else {
    // 'tall'
    y1 = safeAreaMargins.top;
    y2 = canvasSize.height - safeAreaMargins.bottom - deviceSize;
  }

  return { frame1: { x: x1, y: y1 }, frame2: { x: x2, y: y2 }, size: deviceSize };
}
