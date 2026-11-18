import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer, { addElement, setSelectedId } from '../../../store/editorSlice';
import ColorBlockControls from '../../../components/panels/ColorBlockControls';

vi.mock('react-color', () => import('./colorPickerMock.jsx'));

function setup({ type = 'colorBlock', select = true } = {}) {
  const store = configureStore({ reducer: { editor: editorReducer } });
  store.dispatch(addElement({ type, fill: '#ffffff', text: 'T', x: 0, y: 0, width: 100, height: 100 }));
  const id = store.getState().editor.elements[0].id;
  store.dispatch(setSelectedId(select ? id : null));
  // reset history produced by addElement so assertions count only control actions
  const base = store.getState().editor.history.past.length;
  const { container } = render(<Provider store={store}><ColorBlockControls /></Provider>);
  const el = () => store.getState().editor.elements[0];
  const past = () => store.getState().editor.history.past.length - base;
  return { store, container, el, past };
}

describe('ColorBlockControls', () => {
  it('renders nothing when no element is selected', () => {
    const { container } = setup({ select: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for non-colorBlock elements', () => {
    const { container } = setup({ type: 'text' });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the swatch with current fill and toggles the picker', async () => {
    const user = userEvent.setup();
    const { container } = setup();
    expect(screen.getByText('Кольоровий елемент')).toBeInTheDocument();
    const swatch = container.querySelector('.color-swatch-btn');
    expect(swatch).toHaveStyle({ background: '#ffffff' });

    expect(screen.queryByTestId('chrome-picker')).toBeNull();
    await user.click(swatch);
    expect(screen.getByTestId('chrome-picker')).toBeInTheDocument();
    await user.click(swatch);
    expect(screen.queryByTestId('chrome-picker')).toBeNull();
  });

  it('live drag updates fill and pushes history only once per drag session', async () => {
    const user = userEvent.setup();
    const { container, el, past } = setup();
    await user.click(container.querySelector('.color-swatch-btn'));

    await user.click(screen.getByText('drag-red'));
    await user.click(screen.getByText('drag-green'));
    expect(el().fill).toBe('#00ff00');
    expect(past()).toBe(1);
  });

  it('release commits fill with history and starts a new session for the next drag', async () => {
    const user = userEvent.setup();
    const { container, el, past } = setup();
    await user.click(container.querySelector('.color-swatch-btn'));

    await user.click(screen.getByText('drag-red'));       // +1 (session start)
    await user.click(screen.getByText('release-green'));  // +1 (commit)
    expect(el().fill).toBe('#00ff00');
    expect(past()).toBe(2);

    await user.click(screen.getByText('drag-red'));       // +1 (new session)
    expect(past()).toBe(3);
  });
});
