import { saveAs } from 'file-saver';

const DB_NAME = 'banner_constructor';
const DB_VERSION = 2;
const STORE_NAME = 'projects';
const LS_LEGACY_KEY = 'banner_saved_projects';
const AUTO_SAVE_KEY = 'banner_project_v2';
const MAX_PROJECTS = 20;
const THUMBNAIL_TARGET_WIDTH = 200;

export { MAX_PROJECTS };

let _dbPromise = null;

export function getDB() {
  if (!_dbPromise) {
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }
      };

      req.onsuccess = async e => {
        const db = e.target.result;
        // Migrate from localStorage if user had projects saved there
        const legacy = localStorage.getItem(LS_LEGACY_KEY);
        if (legacy) {
          try {
            const projects = JSON.parse(legacy);
            if (Array.isArray(projects) && projects.length > 0) {
              const tx = db.transaction(STORE_NAME, 'readwrite');
              const store = tx.objectStore(STORE_NAME);
              for (const p of projects) store.put(p);
              await new Promise(r => { tx.oncomplete = r; tx.onerror = r; });
            }
            localStorage.removeItem(LS_LEGACY_KEY);
          } catch {
            // ignore migration errors
          }
        }
        resolve(db);
      };

      req.onerror = () => {
        _dbPromise = null;
        reject(req.error);
      };
    });
  }
  return _dbPromise;
}

export async function loadProjects() {
  try {
    const db = await getDB();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      req.onsuccess = () =>
        resolve((req.result ?? []).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)));
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveNewProject(name, state, thumbnail) {
  const projects = await loadProjects();
  if (projects.length >= MAX_PROJECTS) throw new Error('LIMIT_REACHED');

  const project = {
    id: crypto.randomUUID(),
    name: name.trim() || 'Без назви',
    savedAt: new Date().toISOString(),
    thumbnail: thumbnail ?? null,
    state,
  };

  const db = await getDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(project);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });

  return { project, projects: [project, ...projects] };
}

export async function deleteProject(id) {
  const db = await getDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  return loadProjects();
}

export function generateThumbnail(stageRef) {
  const stage = stageRef?.current;
  if (!stage) return null;
  try {
    const pixelRatio = THUMBNAIL_TARGET_WIDTH / stage.width();
    return stage.toDataURL({ mimeType: 'image/jpeg', quality: 0.3, pixelRatio });
  } catch {
    return null;
  }
}

export function estimateStateKB(state) {
  try { return Math.round(JSON.stringify(state).length / 1024); } catch { return 0; }
}

export function syncAutoSave(state) {
  try { localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(state)); } catch {/* quota */}
}

export function formatProjectDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('uk-UA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function exportProjectToFile(name, state) {
  const data = { __version: 1, name: name || 'Без назви', exportedAt: new Date().toISOString(), state };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const filename = (name || 'banner-project').replace(/[^a-zA-Zа-яА-ЯіІїЇєЄ0-9_-]/g, '_') + '.json';
  saveAs(blob, filename);
}

export function importProjectFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        const state = data.state;
        if (!state?.canvasSize || !Array.isArray(state?.elements)) {
          reject(new Error('Файл не є валідним проектом банера'));
          return;
        }
        resolve({ name: data.name || 'Без назви', state });
      } catch {
        reject(new Error('Не вдалось прочитати файл'));
      }
    };
    reader.onerror = () => reject(new Error('Помилка читання файлу'));
    reader.readAsText(file);
  });
}
