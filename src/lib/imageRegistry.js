import { getDB } from './projects';

const registry = new Map();     // id → src
const reverseIndex = new Map(); // src → id (dedup)

export function storeImage(src) {
  if (!src) return src;
  // Library paths and plain URLs pass through unchanged — only data: and blob: are large
  if (!src.startsWith('data:') && !src.startsWith('blob:')) return src;
  if (reverseIndex.has(src)) return reverseIndex.get(src);
  const id = `img_${crypto.randomUUID()}`;
  registry.set(id, src);
  reverseIndex.set(src, id);
  _persistImage(id, src);
  return id;
}

export function resolveImage(idOrSrc) {
  if (!idOrSrc) return idOrSrc;
  // If it's a registry ID, resolve it; otherwise return as-is (backward compat with old base64 saves)
  return registry.get(idOrSrc) ?? idOrSrc;
}

// Load all images from IDB into the in-memory registry. Call once on app start.
export async function initImageRegistry() {
  try {
    const db = await getDB();
    const all = await new Promise((resolve, reject) => {
      const req = db.transaction('images', 'readonly').objectStore('images').getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
    for (const { id, src } of all) {
      if (!registry.has(id)) {
        registry.set(id, src);
        reverseIndex.set(src, id);
      }
    }
  } catch {
    // IDB unavailable (e.g. test environment) — in-memory registry still works for the session
  }
}

async function _persistImage(id, src) {
  try {
    const db = await getDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      tx.objectStore('images').put({ id, src });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore — image is still available in-memory for this session
  }
}

// Walk Redux state and replace all raw base64/blob srcs with registry IDs.
// Used on app startup to migrate old saves, and after import.
export function storeStateImages(state) {
  const elements = (state.elements ?? []).map(el => {
    if (el.type === 'image' && el.src) {
      const id = storeImage(el.src);
      return id !== el.src ? { ...el, src: id } : el;
    }
    return el;
  });
  const bgSrc = state.backgroundImage?.src;
  const newBgSrc = bgSrc ? storeImage(bgSrc) : bgSrc;
  const backgroundImage = newBgSrc !== bgSrc
    ? { ...state.backgroundImage, src: newBgSrc }
    : state.backgroundImage;
  return { ...state, elements, backgroundImage };
}

// Walk Redux state and resolve all registry IDs back to actual srcs.
// Used before exporting to file so the exported JSON is self-contained.
export function resolveStateImages(state) {
  const elements = (state.elements ?? []).map(el => {
    if (el.type === 'image' && el.src) {
      const resolved = resolveImage(el.src);
      return resolved !== el.src ? { ...el, src: resolved } : el;
    }
    return el;
  });
  const bgSrc = state.backgroundImage?.src;
  const newBgSrc = bgSrc ? resolveImage(bgSrc) : bgSrc;
  const backgroundImage = newBgSrc !== bgSrc
    ? { ...state.backgroundImage, src: newBgSrc }
    : state.backgroundImage;
  return { ...state, elements, backgroundImage };
}
