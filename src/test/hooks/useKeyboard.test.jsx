import { describe, it, expect } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer, { addElement, pushHistory, setSelectedId } from '../../store/editorSlice';
import { useKeyboard } from '../../hooks/useKeyboard';

function Harness() {
  useKeyboard();
  return <input data-testid="field" />;
}

function setup() {
  const store = configureStore({ reducer: { editor: editorReducer } });
  const utils = render(<Provider store={store}><Harness /></Provider>);
  return { store, ...utils };
}

const state = store => store.getState().editor;

function addText(store) {
  act(() => {
    store.dispatch(addElement({ type: 'text', text: 'A', x: 0, y: 0, width: 100 }));
  });
  return state(store).elements.at(-1).id;
}

describe('useKeyboard', () => {
  it('Ctrl+Z undoes the last history step', () => {
    const { store } = setup();
    addText(store);
    expect(state(store).elements).toHaveLength(1);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(state(store).elements).toHaveLength(0);
  });

  it('Cmd+Z (metaKey) also undoes', () => {
    const { store } = setup();
    addText(store);
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    expect(state(store).elements).toHaveLength(0);
  });

  it('Ctrl+Shift+Z and Ctrl+Y redo', () => {
    const { store } = setup();
    addText(store);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(state(store).elements).toHaveLength(1);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    expect(state(store).elements).toHaveLength(1);
  });

  it('Delete and Backspace remove the selected element', () => {
    const { store } = setup();
    const id1 = addText(store);
    const id2 = addText(store);
    act(() => { store.dispatch(setSelectedId(id2)); });
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(state(store).elements.map(e => e.id)).toEqual([id1]);

    act(() => { store.dispatch(setSelectedId(id1)); });
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(state(store).elements).toHaveLength(0);
  });

  it('Delete does nothing when nothing is selected', () => {
    const { store } = setup();
    addText(store);
    act(() => { store.dispatch(setSelectedId(null)); });
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(state(store).elements).toHaveLength(1);
  });

  it('ignores shortcuts while typing in an input', () => {
    const { store, getByTestId } = setup();
    const id = addText(store);
    act(() => { store.dispatch(setSelectedId(id)); });
    getByTestId('field').focus();
    fireEvent.keyDown(window, { key: 'Backspace' });
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(state(store).elements).toHaveLength(1);
  });

  it('plain "z" without modifier does not undo', () => {
    const { store } = setup();
    addText(store);
    act(() => { store.dispatch(pushHistory()); });
    fireEvent.keyDown(window, { key: 'z' });
    expect(state(store).history.past.length).toBeGreaterThan(0);
    expect(state(store).elements).toHaveLength(1);
  });

  it('removes the listener on unmount', () => {
    const { store, unmount } = setup();
    addText(store);
    unmount();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(state(store).elements).toHaveLength(1);
  });
});
