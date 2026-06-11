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
  history: { past: [], future: [] },
};

export const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    pushHistory(state) {
      state.history.past.push(JSON.parse(JSON.stringify(state.elements)));
      if (state.history.past.length > 50) state.history.past.shift();
      state.history.future = [];
    },
    undoHistory(state) {
      if (!state.history.past.length) return;
      state.history.future.unshift(JSON.parse(JSON.stringify(state.elements)));
      state.elements = state.history.past.pop();
      if (state.selectedId && !state.elements.find(e => e.id === state.selectedId)) {
        state.selectedId = null;
      }
    },
    redoHistory(state) {
      if (!state.history.future.length) return;
      state.history.past.push(JSON.parse(JSON.stringify(state.elements)));
      state.elements = state.history.future.shift();
    },

    setCanvasSize(state, action) {
      state.canvasSize = action.payload;
    },
    setBackground(state, action) {
      state.background = { ...state.background, ...action.payload };
    },
    setBackgroundImage(state, action) {
      state.backgroundImage = action.payload;
    },
    updateBackgroundImage(state, action) {
      Object.assign(state.backgroundImage, action.payload);
    },
    clearBackgroundImage(state) {
      state.backgroundImage = { src: null, x: 0, y: 0, width: 0, height: 0, rotation: 0 };
      if (state.selectedId === '__bg_image__') state.selectedId = null;
    },

    addElement(state, action) {
      state.history.past.push(JSON.parse(JSON.stringify(state.elements)));
      if (state.history.past.length > 50) state.history.past.shift();
      state.history.future = [];
      const el = { id: uuidv4(), visible: true, rotation: 0, opacity: 1, ...action.payload };
      state.elements.push(el);
      state.selectedId = el.id;
    },
    prependElement(state, action) {
      state.history.past.push(JSON.parse(JSON.stringify(state.elements)));
      if (state.history.past.length > 50) state.history.past.shift();
      state.history.future = [];
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
      state.history.past.push(JSON.parse(JSON.stringify(state.elements)));
      if (state.history.past.length > 50) state.history.past.shift();
      state.history.future = [];
      const { id, ...changes } = action.payload;
      const idx = state.elements.findIndex(e => e.id === id);
      if (idx !== -1) Object.assign(state.elements[idx], changes);
    },
    deleteElement(state, action) {
      state.history.past.push(JSON.parse(JSON.stringify(state.elements)));
      if (state.history.past.length > 50) state.history.past.shift();
      state.history.future = [];
      state.elements = state.elements.filter(e => e.id !== action.payload);
      if (state.selectedId === action.payload) state.selectedId = null;
    },
    reorderLayers(state, action) {
      const { fromIndex, toIndex } = action.payload;
      state.history.past.push(JSON.parse(JSON.stringify(state.elements)));
      if (state.history.past.length > 50) state.history.past.shift();
      state.history.future = [];
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
    resetProject(state) {
      Object.assign(state, { ...initialState, history: { past: [], future: [] } });
    },
    loadProject(state, action) {
      const { canvasSize, background, backgroundImage, elements } = action.payload;
      state.canvasSize = canvasSize;
      state.background = background ?? { color: '#ffffff' };
      state.backgroundImage = backgroundImage ?? { src: null, x: 0, y: 0, width: 0, height: 0, rotation: 0 };
      state.elements = elements;
      state.selectedId = null;
      state.history = { past: [], future: [] };
    },
  },
});

export const {
  pushHistory, undoHistory, redoHistory,
  setCanvasSize, setBackground, setBackgroundImage, updateBackgroundImage, clearBackgroundImage,
  addElement, prependElement, updateElement, updateElementWithHistory, deleteElement,
  reorderLayers, setSelectedId, toggleSnapGrid, toggleKeepRatio,
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
export const selectCanUndo = s => s.editor.history.past.length > 0;
export const selectCanRedo = s => s.editor.history.future.length > 0;

export default editorSlice.reducer;
