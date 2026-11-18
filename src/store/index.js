import { configureStore } from '@reduxjs/toolkit';
import editorReducer, { loadProject } from './editorSlice';

// Read the autosaved project synchronously BEFORE first render, so the first
// useLocalStorageSave run persists the restored project instead of overwriting
// it with the empty default state.
function loadSavedState() {
  try {
    const raw =
      localStorage.getItem('banner_project_v2') ??
      localStorage.getItem('banner_project_v1');
    if (!raw) return undefined;
    const data = JSON.parse(raw);
    if (!data?.canvasSize || !Array.isArray(data?.elements)) return undefined;
    // Same normalisation as opening a project from the Projects modal / file import:
    // defaults for missing fields, deviceFramesLayout fallback, cleared selection & history.
    return editorReducer(undefined, loadProject(data));
  } catch {
    return undefined;
  }
}

// API keys of removed features (AI background via Gemini, remove.bg cut-out).
// Delete them so the secrets don't linger in the browser.
const REMOVED_FEATURE_KEYS = ['gemini_api_key', 'removebg_api_key'];

function clearRemovedFeatureKeys() {
  try {
    REMOVED_FEATURE_KEYS.forEach(k => localStorage.removeItem(k));
  } catch {
    // storage unavailable — nothing to clean
  }
}

let savedEditorState;
if (typeof window !== 'undefined') {
  clearRemovedFeatureKeys();
  savedEditorState = loadSavedState();
}

export const store = configureStore({
  reducer: {
    editor: editorReducer,
  },
  preloadedState: savedEditorState ? { editor: savedEditorState } : undefined,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({ serializableCheck: false }),
});
