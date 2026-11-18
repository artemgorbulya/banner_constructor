import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer, { addElement, setBackground } from '../../store/editorSlice';
import { useLocalStorageSave } from '../../hooks/useLocalStorage';

const KEY = 'banner_project_v2';

function Harness() {
  const { quotaExceeded } = useLocalStorageSave();
  return <div data-testid="quota">{String(quotaExceeded)}</div>;
}

function setup() {
  const store = configureStore({ reducer: { editor: editorReducer } });
  const utils = render(<Provider store={store}><Harness /></Provider>);
  return { store, ...utils };
}

describe('useLocalStorageSave', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('saves project state after a 1s debounce', () => {
    setup();
    expect(localStorage.getItem(KEY)).toBeNull();
    act(() => { vi.advanceTimersByTime(999); });
    expect(localStorage.getItem(KEY)).toBeNull();
    act(() => { vi.advanceTimersByTime(1); });

    const saved = JSON.parse(localStorage.getItem(KEY));
    expect(saved).toEqual({
      canvasSize: { width: 880, height: 408 },
      background: { color: '#ffffff' },
      backgroundImage: { src: null, x: 0, y: 0, width: 0, height: 0, rotation: 0 },
      elements: [],
      safeAreaMargins: { top: 24, right: 32, bottom: 48, left: 32 },
      deviceFramesLayout: 'tall',
    });
  });

  it('does not save UI-only state (selection, history, toggles)', () => {
    setup();
    act(() => { vi.advanceTimersByTime(1000); });
    const saved = JSON.parse(localStorage.getItem(KEY));
    expect(saved).not.toHaveProperty('selectedId');
    expect(saved).not.toHaveProperty('history');
    expect(saved).not.toHaveProperty('snapEnabled');
  });

  it('restarts the debounce on every change and writes only the latest state', () => {
    const { store } = setup();
    const spy = vi.spyOn(Storage.prototype, 'setItem');

    act(() => { vi.advanceTimersByTime(500); });
    act(() => { store.dispatch(setBackground({ color: '#ff0000' })); });
    act(() => { vi.advanceTimersByTime(500); });
    act(() => { store.dispatch(addElement({ type: 'text', text: 'Hi', x: 0, y: 0, width: 50 })); });
    act(() => { vi.advanceTimersByTime(999); });
    expect(spy).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    expect(spy).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(localStorage.getItem(KEY));
    expect(saved.background.color).toBe('#ff0000');
    expect(saved.elements).toHaveLength(1);
  });

  it('reports quotaExceeded when localStorage throws, and clears it after a successful save', () => {
    const { store, getByTestId } = setup();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(getByTestId('quota').textContent).toBe('true');

    spy.mockRestore();
    act(() => { store.dispatch(setBackground({ color: '#000000' })); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(getByTestId('quota').textContent).toBe('false');
  });

  it('cancels a pending save on unmount', () => {
    const { unmount } = setup();
    unmount();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
