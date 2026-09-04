import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer, { selectElements } from '../../store/editorSlice';
import AddPanel from '../../components/panels/AddPanel';

function makeStore(overrides = {}) {
  return configureStore({
    reducer: { editor: editorReducer },
    preloadedState: { editor: { ...editorReducer(undefined, { type: '@@INIT' }), ...overrides } },
  });
}

function renderPanel(store) {
  render(<Provider store={store}><AddPanel /></Provider>);
  return store;
}

describe('AddPanel — Кольоровий елемент button', () => {
  it('adds a white square colorBlock sized to 50% of canvas height, centered', async () => {
    const user = userEvent.setup();
    const store = makeStore({ canvasSize: { width: 880, height: 408 } });
    renderPanel(store);
    await user.click(screen.getByText('Кольоровий елемент'));

    const elements = selectElements(store.getState());
    expect(elements).toHaveLength(1);
    const el = elements[0];
    expect(el.type).toBe('colorBlock');
    expect(el.fill).toBe('#ffffff');
    expect(el.width).toBe(204); // round(408 * 0.5)
    expect(el.height).toBe(204);
    expect(el.x).toBe(Math.round((880 - 204) / 2));
    expect(el.y).toBe(Math.round((408 - 204) / 2));
    expect(el.name).toBe('Кольоровий блок');
  });

  it('selects the newly added colorBlock', async () => {
    const user = userEvent.setup();
    const store = makeStore();
    renderPanel(store);
    await user.click(screen.getByText('Кольоровий елемент'));
    const state = store.getState().editor;
    expect(state.selectedId).toBe(state.elements[0].id);
  });
});
