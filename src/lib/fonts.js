export const LOCAL_FONTS = [
  'Rozetkaweb Regular',
  'Rozetkaweb Bold',
  'Rozetkaweb Medium',
  'Rozetkaweb Light',
  'Rozetkaweb Black',
];

const loadedFonts = new Set(['sans-serif', 'serif', 'monospace']);
const pendingLoads = new Map();

export function loadFont(fontFamily) {
  if (loadedFonts.has(fontFamily)) return Promise.resolve();
  if (pendingLoads.has(fontFamily)) return pendingLoads.get(fontFamily);

  const promise = document.fonts.load(`400 16px "${fontFamily}"`)
    .then(() => {
      loadedFonts.add(fontFamily);
      pendingLoads.delete(fontFamily);
    })
    .catch(() => {
      loadedFonts.add(fontFamily);
      pendingLoads.delete(fontFamily);
    });

  pendingLoads.set(fontFamily, promise);
  return promise;
}

// Pre-warm all local fonts at import time so they are ready when first used
LOCAL_FONTS.forEach(f => loadFont(f));
