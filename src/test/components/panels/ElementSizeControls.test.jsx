import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer, {
  addElement, setSelectedId, setBackgroundImage, toggleKeepRatio,
} from '../../../store/editorSlice';
import ElementSizeControls from '../../../components/panels/ElementSizeControls';

function setup({ element, bg, keepRatio = true, select = 'element' } = {}) {
  const store = configureStore({ reducer: { editor: editorReducer } });
  if (!keepRatio) store.dispatch(toggleKeepRatio());
  if (bg) store.dispatch(setBackgroundImage(bg));
  if (element) store.dispatch(addElement(element));
  const id = select === 'bg' ? '__bg_image__' : select === 'element' ? store.getState().editor.elements[0]?.id : null;
  store.dispatch(setSelectedId(id ?? null));
  const utils = render(<Provider store={store}><ElementSizeControls /></Provider>);
  const [w, h] = utils.container.querySelectorAll('input');
  return { store, w, h, ...utils, state: () => store.getState().editor };
}

const image = { type: 'image', src: '/a.png', x: 0, y: 0, width: 200, height: 100 };

describe('ElementSizeControls', () => {
  it('renders nothing when nothing is selected', () => {
    expect(setup({ element: image, select: null }).container).toBeEmptyDOMElement();
  });

  it('shows rounded current size of the selected element', () => {
    const { w, h } = setup({ element: { ...image, width: 200.4, height: 99.6 } });
    expect(w).toHaveValue(200);
    expect(h).toHaveValue(100);
  });

  it('with keepRatio, editing W recalculates H and vice versa', () => {
    const { w, h } = setup({ element: image });
    fireEvent.change(w, { target: { value: '300' } });
    expect(h).toHaveValue(150);
    fireEvent.change(h, { target: { value: '50' } });
    expect(w).toHaveValue(100);
  });

  it('without keepRatio, W and H are independent', () => {
    const { w, h } = setup({ element: image, keepRatio: false });
    fireEvent.change(w, { target: { value: '300' } });
    expect(h).toHaveValue(100);
  });

  it('Застосувати commits size with history', async () => {
    const user = userEvent.setup();
    const { w, state } = setup({ element: image });
    const before = state().history.past.length;
    fireEvent.change(w, { target: { value: '400' } });
    await user.click(screen.getByText('Застосувати'));
    expect(state().elements[0]).toMatchObject({ width: 400, height: 200 });
    expect(state().history.past.length).toBe(before + 1);
  });

  it('Enter in a field applies the size', () => {
    const { w, state } = setup({ element: image, keepRatio: false });
    fireEvent.change(w, { target: { value: '250' } });
    fireEvent.keyDown(w, { key: 'Enter' });
    expect(state().elements[0]).toMatchObject({ width: 250, height: 100 });
  });

  it('clamps values below 10 and empty input to 10', async () => {
    const user = userEvent.setup();
    const { w, h, state } = setup({ element: image, keepRatio: false });
    fireEvent.change(w, { target: { value: '3' } });
    fireEvent.change(h, { target: { value: '' } });
    await user.click(screen.getByText('Застосувати'));
    expect(state().elements[0]).toMatchObject({ width: 10, height: 10 });
  });

  it('text: height is disabled, hint is shown and only width is applied', async () => {
    const user = userEvent.setup();
    const { w, h, state } = setup({ element: { type: 'text', text: 'Hi', x: 0, y: 0, width: 120, height: 40 } });
    expect(h).toBeDisabled();
    expect(screen.getByText('Висота тексту визначається автоматично')).toBeInTheDocument();
    fireEvent.change(w, { target: { value: '300' } });
    await user.click(screen.getByText('Застосувати'));
    expect(state().elements[0].width).toBe(300);
    expect(state().elements[0].height).toBe(40);
  });

  it('background image: shows and updates background size', async () => {
    const user = userEvent.setup();
    const { w, h, state } = setup({
      bg: { src: 'img_1', x: 0, y: 0, width: 880, height: 440, rotation: 0 },
      select: 'bg',
    });
    expect(w).toHaveValue(880);
    expect(h).toHaveValue(440);
    fireEvent.change(w, { target: { value: '1760' } });
    expect(h).toHaveValue(880);
    await user.click(screen.getByText('Застосувати'));
    expect(state().backgroundImage).toMatchObject({ width: 1760, height: 880 });
    expect(state().elements).toEqual([]);
  });

  it('syncs fields when the element is resized elsewhere (e.g. on canvas)', () => {
    const { store, w, h } = setup({ element: image });
    const id = store.getState().editor.elements[0].id;
    act(() => {
      store.dispatch({ type: 'editor/updateElement', payload: { id, width: 50, height: 25 } });
    });
    expect(w).toHaveValue(50);
    expect(h).toHaveValue(25);
  });
});
