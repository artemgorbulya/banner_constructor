import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { createElement } from 'react';
import editorReducer, { toggleSnapGrid } from '../../store/editorSlice';
import { useSnapGrid } from '../../hooks/useSnapGrid';

function makeStore(snapEnabled = true) {
  const store = configureStore({ reducer: { editor: editorReducer } });
  if (!snapEnabled) store.dispatch(toggleSnapGrid());
  return store;
}

function wrapper(store) {
  return ({ children }) => createElement(Provider, { store }, children);
}

describe('useSnapGrid — snap enabled', () => {
  it('rounds to nearest 10px grid', () => {
    const store = makeStore(true);
    const { result } = renderHook(() => useSnapGrid(), { wrapper: wrapper(store) });
    expect(result.current({ x: 13, y: 17 })).toEqual({ x: 10, y: 20 });
  });

  it('keeps zero as zero', () => {
    const store = makeStore(true);
    const { result } = renderHook(() => useSnapGrid(), { wrapper: wrapper(store) });
    expect(result.current({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('rounds 5 up to 10 (Math.round behaviour)', () => {
    const store = makeStore(true);
    const { result } = renderHook(() => useSnapGrid(), { wrapper: wrapper(store) });
    expect(result.current({ x: 5, y: 5 })).toEqual({ x: 10, y: 10 });
  });

  it('snaps exactly on-grid values unchanged', () => {
    const store = makeStore(true);
    const { result } = renderHook(() => useSnapGrid(), { wrapper: wrapper(store) });
    expect(result.current({ x: 100, y: 200 })).toEqual({ x: 100, y: 200 });
  });
});

describe('useSnapGrid — snap disabled', () => {
  it('returns position unchanged', () => {
    const store = makeStore(false);
    const { result } = renderHook(() => useSnapGrid(), { wrapper: wrapper(store) });
    expect(result.current({ x: 13, y: 17 })).toEqual({ x: 13, y: 17 });
  });
});
