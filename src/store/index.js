import { configureStore } from '@reduxjs/toolkit';
import editorReducer from './editorSlice';

// Read saved project synchronously BEFORE first render.
// This avoids the race condition where useLocalStorageSave fires on mount
// with the default empty state and overwrites the previously saved project
// before useLocalStorageRestore gets a chance to read it.
function loadSavedState() {
  try {
    const raw =
      localStorage.getItem('banner_project_v2') ??
      localStorage.getItem('banner_project_v1');
    if (!raw) return undefined;
    const data = JSON.parse(raw);
    if (!data?.canvasSize || !Array.isArray(data?.elements)) return undefined;
    return {
      canvasSize: data.canvasSize,
      background: data.background ?? { color: '#ffffff' },
      backgroundImage: data.backgroundImage ?? { src: null, x: 0, y: 0, width: 0, height: 0, rotation: 0 },
      elements: data.elements,
      selectedId: null,
      snapEnabled: true,
      keepRatio: true,
      history: { past: [], future: [] },
    };
  } catch {
    return undefined;
  }
}

const savedEditorState = typeof window !== 'undefined' ? loadSavedState() : undefined;

export const store = configureStore({
  reducer: {
    editor: editorReducer,
  },
  preloadedState: savedEditorState ? { editor: savedEditorState } : undefined,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({ serializableCheck: false }),
});
