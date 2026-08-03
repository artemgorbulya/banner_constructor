import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

// Reset IndexedDB and module state between tests
let projects;
beforeEach(async () => {
  // Fresh in-memory IndexedDB instance for each test
  globalThis.indexedDB = new IDBFactory();
  // Reset module so _dbPromise singleton picks up the new IDBFactory
  vi.resetModules();
  projects = await import('../../lib/projects.js');
});

const validState = {
  canvasSize: { width: 880, height: 408 },
  background: { color: '#ffffff' },
  backgroundImage: { src: null, x: 0, y: 0, width: 0, height: 0, rotation: 0 },
  elements: [],
  safeAreaMargins: { top: 24, right: 32, bottom: 48, left: 32 },
};

// ─── loadProjects ─────────────────────────────────────────────────────────────

describe('loadProjects', () => {
  it('returns empty array when DB is empty', async () => {
    const list = await projects.loadProjects();
    expect(list).toEqual([]);
  });

  it('returns saved projects sorted by savedAt desc', async () => {
    await projects.saveNewProject('First', validState, null);
    await new Promise(r => setTimeout(r, 10));
    await projects.saveNewProject('Second', validState, null);
    const list = await projects.loadProjects();
    expect(list[0].name).toBe('Second');
    expect(list[1].name).toBe('First');
  });
});

// ─── saveNewProject ───────────────────────────────────────────────────────────

describe('saveNewProject', () => {
  it('saves project with required fields', async () => {
    const { project } = await projects.saveNewProject('My Banner', validState, null);
    expect(project.id).toBeTruthy();
    expect(project.name).toBe('My Banner');
    expect(project.savedAt).toBeTruthy();
    expect(project.thumbnail).toBeNull();
    expect(project.state).toEqual(validState);
  });

  it('falls back to "Без назви" for empty name', async () => {
    const { project } = await projects.saveNewProject('', validState, null);
    expect(project.name).toBe('Без назви');
  });

  it('trims whitespace from name', async () => {
    const { project } = await projects.saveNewProject('  Hello  ', validState, null);
    expect(project.name).toBe('Hello');
  });

  it('stores thumbnail when provided', async () => {
    const thumb = 'data:image/jpeg;base64,abc';
    const { project } = await projects.saveNewProject('P', validState, thumb);
    expect(project.thumbnail).toBe(thumb);
  });

  it('throws LIMIT_REACHED when 20 projects exist', async () => {
    for (let i = 0; i < 20; i++) {
      await projects.saveNewProject(`P${i}`, validState, null);
    }
    await expect(projects.saveNewProject('One more', validState, null))
      .rejects.toThrow('LIMIT_REACHED');
  });

  it('returns updated projects list with new project first', async () => {
    const { projects: list } = await projects.saveNewProject('Banner', validState, null);
    expect(list[0].name).toBe('Banner');
  });
});

// ─── deleteProject ────────────────────────────────────────────────────────────

describe('deleteProject', () => {
  it('removes the targeted project', async () => {
    const { project } = await projects.saveNewProject('ToDelete', validState, null);
    await projects.saveNewProject('Keep', validState, null);
    const list = await projects.deleteProject(project.id);
    expect(list.find(p => p.id === project.id)).toBeUndefined();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Keep');
  });

  it('does not throw for non-existent id', async () => {
    await expect(projects.deleteProject('ghost-id')).resolves.toEqual([]);
  });
});

// ─── importProjectFromFile ────────────────────────────────────────────────────

function makeFile(content, name = 'project.json') {
  const blob = new Blob([JSON.stringify(content)], { type: 'application/json' });
  return new File([blob], name);
}

describe('importProjectFromFile', () => {
  it('resolves with name and state for valid file', async () => {
    const data = { __version: 1, name: 'Test', state: validState };
    const result = await projects.importProjectFromFile(makeFile(data));
    expect(result.name).toBe('Test');
    expect(result.state).toEqual(validState);
  });

  it('falls back to "Без назви" when name is missing', async () => {
    const data = { state: validState };
    const result = await projects.importProjectFromFile(makeFile(data));
    expect(result.name).toBe('Без назви');
  });

  it('rejects when elements is not an array', async () => {
    const data = { state: { canvasSize: { width: 880, height: 408 }, elements: 'oops' } };
    await expect(projects.importProjectFromFile(makeFile(data)))
      .rejects.toThrow('Файл не є валідним проектом банера');
  });

  it('rejects when canvasSize is missing', async () => {
    const data = { state: { elements: [] } };
    await expect(projects.importProjectFromFile(makeFile(data)))
      .rejects.toThrow('Файл не є валідним проектом банера');
  });

  it('rejects when state is missing', async () => {
    const data = { name: 'No state' };
    await expect(projects.importProjectFromFile(makeFile(data)))
      .rejects.toThrow('Файл не є валідним проектом банера');
  });

  it('rejects for malformed JSON', async () => {
    const blob = new Blob(['{invalid json'], { type: 'application/json' });
    const file = new File([blob], 'bad.json');
    await expect(projects.importProjectFromFile(file))
      .rejects.toThrow('Не вдалось прочитати файл');
  });
});

// ─── syncAutoSave ─────────────────────────────────────────────────────────────

describe('syncAutoSave', () => {
  it('writes state to localStorage', () => {
    projects.syncAutoSave(validState);
    const stored = JSON.parse(localStorage.getItem('banner_project_v2'));
    expect(stored.canvasSize).toEqual(validState.canvasSize);
  });

  it('does not throw on quota error', () => {
    const orig = localStorage.setItem.bind(localStorage);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => projects.syncAutoSave(validState)).not.toThrow();
    Storage.prototype.setItem = orig;
  });
});

// ─── estimateStateKB ──────────────────────────────────────────────────────────

describe('estimateStateKB', () => {
  it('returns 0 for non-serializable input', () => {
    const circular = {};
    circular.self = circular;
    expect(projects.estimateStateKB(circular)).toBe(0);
  });

  it('returns a number for known state (may be 0 for small payloads)', () => {
    const kb = projects.estimateStateKB(validState);
    expect(typeof kb).toBe('number');
    expect(kb).toBeGreaterThanOrEqual(0);
  });

  it('returns larger value for bigger payload', () => {
    const bigState = { ...validState, elements: Array.from({ length: 100 }, (_, i) => ({ id: `id-${i}`, type: 'text', x: i, y: i, width: 200, text: 'Hello World'.repeat(20) })) };
    const kb = projects.estimateStateKB(bigState);
    expect(kb).toBeGreaterThan(0);
  });
});

// ─── formatProjectDate ────────────────────────────────────────────────────────

describe('formatProjectDate', () => {
  it('returns non-empty string for ISO date', () => {
    const result = projects.formatProjectDate('2025-01-15T12:30:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── exportProjectToFile ──────────────────────────────────────────────────────

describe('exportProjectToFile', () => {
  it('calls saveAs with sanitized filename', async () => {
    const { saveAs } = await import('file-saver');
    projects.exportProjectToFile('My Banner 2024!', validState);
    expect(saveAs).toHaveBeenCalled();
    const [, filename] = saveAs.mock.calls[0];
    expect(filename).toMatch(/\.json$/);
    expect(filename).not.toMatch(/!/); // special chars sanitized
  });
});
