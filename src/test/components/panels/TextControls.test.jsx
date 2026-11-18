import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer, { addElement, setSelectedId } from '../../../store/editorSlice';
import TextControls from '../../../components/panels/TextControls';
import { loadFont } from '../../../lib/fonts';

vi.mock('react-color', () => import('./colorPickerMock.jsx'));
vi.mock('../../../lib/fonts', () => ({
  LOCAL_FONTS: ['Rozetka306pro Regular', 'Rozetka306pro Bold'],
  loadFont: vi.fn(() => Promise.resolve()),
}));

const baseText = {
  type: 'text', text: 'Hello', x: 0, y: 0, width: 200,
  fontSize: 36, fontFamily: 'Rozetka306pro Regular', fontStyle: 'normal',
  textDecoration: '', align: 'left', lineHeight: 1.2, fill: '#1a1a1a',
};

function setup(overrides = {}, { type = 'text', select = true } = {}) {
  const store = configureStore({ reducer: { editor: editorReducer } });
  store.dispatch(addElement({ ...baseText, ...overrides, type }));
  const id = store.getState().editor.elements[0].id;
  store.dispatch(setSelectedId(select ? id : null));
  const base = store.getState().editor.history.past.length;
  const utils = render(<Provider store={store}><TextControls /></Provider>);
  const el = () => store.getState().editor.elements[0];
  const past = () => store.getState().editor.history.past.length - base;
  return { store, el, past, ...utils };
}

// Format buttons render only lucide icons — locate them by position
const fmtButtons = container => container.querySelectorAll('.format-btns')[0].querySelectorAll('button');

describe('TextControls', () => {
  beforeEach(() => { loadFont.mockClear(); });

  it('renders nothing without a selected text element', () => {
    expect(setup({}, { select: false }).container).toBeEmptyDOMElement();
  });

  it('renders nothing for image or colorBlock elements', () => {
    expect(setup({}, { type: 'image' }).container).toBeEmptyDOMElement();
  });

  it('typing in the content field updates text and pushes history once per editing session', () => {
    const { container, el, past } = setup();
    const ta = container.querySelector('textarea');
    expect(ta).toHaveValue('Hello');
    fireEvent.change(ta, { target: { value: 'Hello!' } });
    fireEvent.change(ta, { target: { value: 'Hello!!' } });
    expect(el().text).toBe('Hello!!');
    expect(past()).toBe(1);
  });

  it('font change awaits loadFont before committing', async () => {
    const { container, el, past } = setup();
    let resolve;
    loadFont.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const select = container.querySelector('select');
    fireEvent.change(select, { target: { value: 'Rozetka306pro Bold' } });

    expect(loadFont).toHaveBeenCalledWith('Rozetka306pro Bold');
    expect(select).toBeDisabled();
    expect(screen.getByText(/завантаження/)).toBeInTheDocument();
    expect(el().fontFamily).toBe('Rozetka306pro Regular');

    resolve();
    await waitFor(() => expect(el().fontFamily).toBe('Rozetka306pro Bold'));
    expect(select).not.toBeDisabled();
    expect(past()).toBe(1);
  });

  it('font size − / + buttons change size by 2 with a minimum of 6', async () => {
    const user = userEvent.setup();
    const { el } = setup({ fontSize: 7 });
    await user.click(screen.getByText('+'));
    expect(el().fontSize).toBe(9);
    await user.click(screen.getByText('−'));
    await user.click(screen.getByText('−'));
    expect(el().fontSize).toBe(6);
  });

  it('font size input accepts numbers and ignores invalid input', () => {
    const { container, el } = setup();
    const input = container.querySelector('input[type="number"]');
    fireEvent.change(input, { target: { value: '48' } });
    expect(el().fontSize).toBe(48);
    fireEvent.change(input, { target: { value: '' } });
    expect(el().fontSize).toBe(48);
  });

  it('line height slider updates live, one history entry per drag', () => {
    const { container, el, past } = setup();
    const range = container.querySelector('input[type="range"]');
    fireEvent.change(range, { target: { value: '1.5' } });
    fireEvent.change(range, { target: { value: '1.8' } });
    expect(el().lineHeight).toBe(1.8);
    expect(past()).toBe(1);
    expect(screen.getByText('Міжрядковий інтервал: 1.8')).toBeInTheDocument();

    fireEvent.mouseUp(range);
    fireEvent.change(range, { target: { value: '2' } });
    expect(past()).toBe(2);
  });

  it('bold / italic toggles combine into fontStyle', async () => {
    const user = userEvent.setup();
    const { container, el } = setup();
    const [bold, italic] = fmtButtons(container);
    await user.click(bold);
    expect(el().fontStyle).toBe('bold');
    await user.click(italic);
    expect(el().fontStyle).toBe('bold italic');
    await user.click(bold);
    expect(el().fontStyle).toBe('italic');
    await user.click(italic);
    expect(el().fontStyle).toBe('normal');
  });

  it('underline toggles textDecoration and marks the button active', async () => {
    const user = userEvent.setup();
    const { container, el } = setup();
    const underline = fmtButtons(container)[2];
    await user.click(underline);
    expect(el().textDecoration).toBe('underline');
    expect(underline).toHaveClass('btn-active');
    await user.click(underline);
    expect(el().textDecoration).toBe('');
  });

  it('alignment buttons set align', async () => {
    const user = userEvent.setup();
    const { el } = setup();
    expect(screen.getByTitle('По лівому краю')).toHaveClass('btn-active');
    await user.click(screen.getByTitle('По центру'));
    expect(el().align).toBe('center');
    await user.click(screen.getByTitle('По правому краю'));
    expect(el().align).toBe('right');
    await user.click(screen.getByTitle('По лівому краю'));
    expect(el().align).toBe('left');
  });

  it('text color picker: live drag + release commit', async () => {
    const user = userEvent.setup();
    const { container, el, past } = setup();
    await user.click(container.querySelector('.color-swatch-btn'));
    await user.click(screen.getByText('drag-red'));
    await user.click(screen.getByText('drag-green'));
    expect(past()).toBe(1);
    await user.click(screen.getByText('release-green'));
    expect(el().fill).toBe('#00ff00');
    expect(past()).toBe(2);
  });
});
