import { createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

const initialState = {
  canvasSize: { width: 880, height: 408 },
  background: { color: '#ffffff' },
  backgroundImage: { src: null, x: 0, y: 0, width: 0, height: 0, rotation: 0 },
  elements: [],
  selectedId: null,
  snapEnabled: true,
  keepRatio: true,
  safeAreaEnabled: true,
  safeAreaMargins: { top: 24, right: 32, bottom: 48, left: 32 },
  history: { past: [], future: [] },
};

function takeSnapshot(state) {
  return JSON.parse(JSON.stringify({
    elements: state.elements,
    background: state.background,
    backgroundImage: state.backgroundImage,
    canvasSize: state.canvasSize,
  }));
}

function pushSnap(state) {
  state.history.past.push(takeSnapshot(state));
  if (state.history.past.length > 50) state.history.past.shift();
  state.history.future = [];
}

function applySnapshot(state, snap) {
  state.elements = snap.elements;
  state.background = snap.background;
  state.backgroundImage = snap.backgroundImage;
  state.canvasSize = snap.canvasSize;
}

export const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    pushHistory(state) {
      pushSnap(state);
    },
    undoHistory(state) {
      if (!state.history.past.length) return;
      state.history.future.unshift(takeSnapshot(state));
      applySnapshot(state, state.history.past.pop());
      if (state.selectedId && !state.elements.find(e => e.id === state.selectedId)) {
        state.selectedId = null;
      }
    },
    redoHistory(state) {
      if (!state.history.future.length) return;
      state.history.past.push(takeSnapshot(state));
      applySnapshot(state, state.history.future.shift());
    },

    setCanvasSize(state, action) {
      pushSnap(state);
      state.canvasSize = action.payload;
    },
    setCanvasSizeAndClear(state, action) {
      pushSnap(state);
      state.canvasSize = action.payload;
      state.elements = [];
      state.background = { color: '#ffffff' };
      state.backgroundImage = { src: null, x: 0, y: 0, width: 0, height: 0, rotation: 0 };
      state.selectedId = null;
    },
    setCanvasSizeAndScale(state, action) {
      pushSnap(state);
      const { width, height } = action.payload;
      const sx = width / state.canvasSize.width;
      const sy = height / state.canvasSize.height;

      // Scale only positions, keep dimensions unchanged, clamp to canvas bounds
      state.elements = state.elements.map(el => {
        const elW = el.width ?? 0;
        const elH = el.type === 'image' ? (el.height ?? elW) : 0;
        const newX = Math.round(el.x * sx);
        const newY = Math.round(el.y * sy);
        return {
          ...el,
          x: Math.max(0, Math.min(newX, Math.max(0, width - elW))),
          y: Math.max(0, Math.min(newY, Math.max(0, height - elH))),
        };
      });

      if (state.backgroundImage.src) {
        // Center background image on new canvas, keep its dimensions
        const bgW = state.backgroundImage.width;
        const bgH = state.backgroundImage.height;
        state.backgroundImage = {
          ...state.backgroundImage,
          x: Math.round((width - bgW) / 2),
          y: Math.round((height - bgH) / 2),
        };
      }

      state.canvasSize = { width, height };
      state.selectedId = null;
    },

    // Live color update while dragging the picker — no history entry
    setBackground(state, action) {
      state.background = { ...state.background, ...action.payload };
    },
    // Called on onChangeComplete — saves one history entry per finished change
    setBackgroundWithHistory(state, action) {
      pushSnap(state);
      state.background = { ...state.background, ...action.payload };
    },

    setBackgroundImage(state, action) {
      pushSnap(state);
      state.backgroundImage = action.payload;
    },
    updateBackgroundImage(state, action) {
      pushSnap(state);
      Object.assign(state.backgroundImage, action.payload);
    },
    clearBackgroundImage(state) {
      pushSnap(state);
      state.backgroundImage = { src: null, x: 0, y: 0, width: 0, height: 0, rotation: 0 };
      if (state.selectedId === '__bg_image__') state.selectedId = null;
    },

    addElement(state, action) {
      pushSnap(state);
      const el = { id: uuidv4(), visible: true, rotation: 0, opacity: 1, ...action.payload };
      state.elements.push(el);
      state.selectedId = el.id;
    },
    prependElement(state, action) {
      pushSnap(state);
      const el = { id: uuidv4(), visible: true, rotation: 0, opacity: 1, ...action.payload };
      state.elements.unshift(el);
      state.selectedId = el.id;
    },
    updateElement(state, action) {
      const { id, ...changes } = action.payload;
      const idx = state.elements.findIndex(e => e.id === id);
      if (idx !== -1) Object.assign(state.elements[idx], changes);
    },
    updateElementWithHistory(state, action) {
      pushSnap(state);
      const { id, ...changes } = action.payload;
      const idx = state.elements.findIndex(e => e.id === id);
      if (idx !== -1) Object.assign(state.elements[idx], changes);
    },
    deleteElement(state, action) {
      pushSnap(state);
      state.elements = state.elements.filter(e => e.id !== action.payload);
      if (state.selectedId === action.payload) state.selectedId = null;
    },
    reorderLayers(state, action) {
      const { fromIndex, toIndex } = action.payload;
      pushSnap(state);
      const [moved] = state.elements.splice(fromIndex, 1);
      state.elements.splice(toIndex, 0, moved);
    },
    setSelectedId(state, action) {
      state.selectedId = action.payload;
    },
    toggleSnapGrid(state) {
      state.snapEnabled = !state.snapEnabled;
    },
    toggleKeepRatio(state) {
      state.keepRatio = !state.keepRatio;
    },
    toggleSafeArea(state) {
      state.safeAreaEnabled = !state.safeAreaEnabled;
    },
    setSafeAreaMargins(state, action) {
      state.safeAreaMargins = { ...state.safeAreaMargins, ...action.payload };
    },
    resetProject(state) {
      Object.assign(state, { ...initialState, history: { past: [], future: [] } });
    },
    loadProject(state, action) {
      const { canvasSize, background, backgroundImage, elements, safeAreaMargins } = action.payload;
      state.canvasSize = canvasSize;
      state.background = background ?? { color: '#ffffff' };
      state.backgroundImage = backgroundImage ?? { src: null, x: 0, y: 0, width: 0, height: 0, rotation: 0 };
      state.elements = elements ?? [];
      state.safeAreaMargins = safeAreaMargins ?? { top: 24, right: 32, bottom: 48, left: 32 };
      state.selectedId = null;
      state.history = { past: [], future: [] };
    },
  },
});

export const {
  pushHistory, undoHistory, redoHistory,
  setCanvasSize, setBackground, setBackgroundWithHistory,
  setBackgroundImage, updateBackgroundImage, clearBackgroundImage,
  addElement, prependElement, updateElement, updateElementWithHistory, deleteElement,
  reorderLayers, setSelectedId, toggleSnapGrid, toggleKeepRatio, toggleSafeArea, setSafeAreaMargins, setCanvasSizeAndClear, setCanvasSizeAndScale,
  resetProject, loadProject,
} = editorSlice.actions;

export const selectCanvasSize = s => s.editor.canvasSize;
export const selectBackground = s => s.editor.background;
export const selectBackgroundImage = s => s.editor.backgroundImage;
export const selectElements = s => s.editor.elements;
export const selectSelectedId = s => s.editor.selectedId;
export const selectSelectedElement = s => s.editor.elements.find(e => e.id === s.editor.selectedId) ?? null;
export const selectSelectedElementType = s => s.editor.elements.find(e => e.id === s.editor.selectedId)?.type ?? null;
export const selectSnapEnabled = s => s.editor.snapEnabled;
export const selectKeepRatio = s => s.editor.keepRatio;
export const selectSafeAreaEnabled = s => s.editor.safeAreaEnabled;
export const selectSafeAreaMargins = s => s.editor.safeAreaMargins;
export const selectCanUndo = s => s.editor.history.past.length > 0;
export const selectCanRedo = s => s.editor.history.future.length > 0;

export default editorSlice.reducer;
