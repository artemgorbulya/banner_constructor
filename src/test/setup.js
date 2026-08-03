import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { createElement } from 'react';

// Mock file-saver
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

// Mock react-konva (Konva is incompatible with JSDOM)
vi.mock('react-konva', () => ({
  Stage: ({ children, ...props }) =>
    createElement('div', { 'data-testid': 'konva-stage', ...props }, children),
  Layer: ({ children }) =>
    createElement('div', { 'data-testid': 'konva-layer' }, children),
  Rect: () => null,
  Group: ({ children }) => createElement('div', null, children),
  Image: () => null,
  Text: () => null,
  Transformer: () => null,
}));

// crypto.randomUUID
let uuidCounter = 0;
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: vi.fn(() => `test-uuid-${++uuidCounter}`) },
  configurable: true,
});

// Reset counter and localStorage between tests
beforeEach(() => {
  uuidCounter = 0;
  localStorage.clear();
});
