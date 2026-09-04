import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer, { addElement, setBackgroundImage } from '../../store/editorSlice';
import LayersPanel from '../../components/panels/LayersPanel';

function makeStore(preloaded = {}) {
  return configureStore({
    reducer: { editor: editorReducer },
    preloadedState: { editor: { ...editorReducer(undefined, { type: '@@INIT' }), ...preloaded } },
  });
}

function renderPanel(store = makeStore()) {
  render(<Provider store={store}><LayersPanel /></Provider>);
  return store;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

describe('LayersPanel — empty state', () => {
  it('renders "Немає елементів" when no elements and no background', () => {
    renderPanel();
    expect(screen.getByText('Немає елементів')).toBeInTheDocument();
  });

  it('does not show empty hint when background image exists', () => {
    const store = makeStore();
    store.dispatch(setBackgroundImage({ src: 'bg.jpg', x: 0, y: 0, width: 800, height: 400, rotation: 0 }));
    renderPanel(store);
    expect(screen.queryByText('Немає елементів')).not.toBeInTheDocument();
  });
});

// ─── Image elements ──────────────────────────────────────────────────────────

describe('LayersPanel — image elements', () => {
  it('shows thumbnail <img> for image element with src', () => {
    const store = makeStore();
    store.dispatch(addElement({ type: 'image', src: 'data:image/png;base64,abc', x: 0, y: 0, width: 100, height: 100, name: 'my-photo' }));
    renderPanel(store);
    const thumbs = document.querySelectorAll('img.layer-thumb');
    expect(thumbs.length).toBeGreaterThan(0);
    expect(thumbs[0].src).toContain('data:image/png');
  });

  it('shows element name for image element', () => {
    const store = makeStore();
    store.dispatch(addElement({ type: 'image', src: 'data:image/png;base64,abc', x: 0, y: 0, width: 100, height: 100, name: 'product-shot' }));
    renderPanel(store);
    expect(screen.getByText('product-shot')).toBeInTheDocument();
  });

  it('falls back to "Зображення" when image has no name', () => {
    const store = makeStore();
    store.dispatch(addElement({ type: 'image', src: 'data:image/png;base64,abc', x: 0, y: 0, width: 100, height: 100 }));
    renderPanel(store);
    expect(screen.getByText('Зображення')).toBeInTheDocument();
  });

  it('does not render text icon for image elements', () => {
    const store = makeStore();
    store.dispatch(addElement({ type: 'image', src: 'data:image/png;base64,abc', x: 0, y: 0, width: 100, height: 100 }));
    renderPanel(store);
    // lucide Type icon renders an svg — check it is not present inside layer items
    const layerItems = document.querySelectorAll('.layer-item');
    expect(layerItems).toHaveLength(1);
    // The item should contain an <img> not a .layer-icon span
    expect(layerItems[0].querySelector('img.layer-thumb')).toBeTruthy();
    expect(layerItems[0].querySelector('.layer-icon')).toBeNull();
  });
});

// ─── Text elements ────────────────────────────────────────────────────────────

describe('LayersPanel — text elements', () => {
  it('shows layer-icon span (not thumbnail) for text element', () => {
    const store = makeStore();
    store.dispatch(addElement({ type: 'text', x: 0, y: 0, width: 200, name: 'Текст' }));
    renderPanel(store);
    const layerItems = document.querySelectorAll('.layer-item');
    expect(layerItems[0].querySelector('.layer-icon')).toBeTruthy();
    expect(layerItems[0].querySelector('img.layer-thumb')).toBeNull();
  });

  it('shows text element name', () => {
    const store = makeStore();
    store.dispatch(addElement({ type: 'text', x: 0, y: 0, width: 200, name: 'Заголовок' }));
    renderPanel(store);
    expect(screen.getByText('Заголовок')).toBeInTheDocument();
  });

  it('falls back to "Текст" when text element has no name', () => {
    const store = makeStore();
    store.dispatch(addElement({ type: 'text', x: 0, y: 0, width: 200 }));
    renderPanel(store);
    expect(screen.getByText('Текст')).toBeInTheDocument();
  });
});

// ─── Color block elements ───────────────────────────────────────────────────

describe('LayersPanel — colorBlock elements', () => {
  it('shows layer-swatch span (not thumbnail or text icon) for colorBlock element', () => {
    const store = makeStore();
    store.dispatch(addElement({ type: 'colorBlock', x: 0, y: 0, width: 100, height: 100, fill: '#ff0000' }));
    renderPanel(store);
    const layerItems = document.querySelectorAll('.layer-item');
    expect(layerItems).toHaveLength(1);
    const swatch = layerItems[0].querySelector('.layer-swatch');
    expect(swatch).toBeTruthy();
    expect(swatch.style.background).toBe('rgb(255, 0, 0)');
    expect(layerItems[0].querySelector('img.layer-thumb')).toBeNull();
    expect(layerItems[0].querySelector('.layer-icon')).toBeNull();
  });

  it('shows element name for colorBlock element', () => {
    const store = makeStore();
    store.dispatch(addElement({ type: 'colorBlock', x: 0, y: 0, width: 100, height: 100, fill: '#ffffff', name: 'custom-block' }));
    renderPanel(store);
    expect(screen.getByText('custom-block')).toBeInTheDocument();
  });

  it('falls back to "Кольоровий блок" when colorBlock has no name', () => {
    const store = makeStore();
    store.dispatch(addElement({ type: 'colorBlock', x: 0, y: 0, width: 100, height: 100, fill: '#ffffff' }));
    renderPanel(store);
    expect(screen.getByText('Кольоровий блок')).toBeInTheDocument();
  });
});

// ─── Background image ─────────────────────────────────────────────────────────

describe('LayersPanel — background image', () => {
  it('renders background image entry with thumbnail', () => {
    const store = makeStore();
    store.dispatch(setBackgroundImage({ src: 'data:image/jpeg;base64,xyz', x: 0, y: 0, width: 800, height: 400, rotation: 0 }));
    renderPanel(store);
    expect(screen.getByText('Фон (зображення)')).toBeInTheDocument();
    const thumb = document.querySelector('img.layer-thumb');
    expect(thumb).toBeTruthy();
    expect(thumb.src).toContain('data:image/jpeg');
  });

  it('does not render background entry when backgroundImage.src is null', () => {
    renderPanel();
    expect(screen.queryByText('Фон (зображення)')).not.toBeInTheDocument();
  });
});

// ─── Visibility toggle ────────────────────────────────────────────────────────

describe('LayersPanel — visibility toggle', () => {
  it('toggles element visibility on eye button click', async () => {
    const user = userEvent.setup();
    const store = makeStore();
    store.dispatch(addElement({ type: 'text', x: 0, y: 0, width: 200, name: 'Текст' }));
    renderPanel(store);

    const eyeBtn = screen.getByTitle('Приховати');
    await user.click(eyeBtn);
    const el = store.getState().editor.elements[0];
    expect(el.visible).toBe(false);
  });
});

// ─── Delete ───────────────────────────────────────────────────────────────────

describe('LayersPanel — delete', () => {
  it('removes element when delete button is clicked', async () => {
    const user = userEvent.setup();
    const store = makeStore();
    store.dispatch(addElement({ type: 'text', x: 0, y: 0, width: 200, name: 'Текст' }));
    renderPanel(store);

    const deleteBtn = screen.getByTitle('Видалити');
    await user.click(deleteBtn);
    expect(store.getState().editor.elements).toHaveLength(0);
  });

  it('removes background image when its delete button is clicked', async () => {
    const user = userEvent.setup();
    const store = makeStore();
    store.dispatch(setBackgroundImage({ src: 'data:image/jpeg;base64,xyz', x: 0, y: 0, width: 800, height: 400, rotation: 0 }));
    renderPanel(store);

    const deleteBtn = screen.getByTitle('Видалити фон');
    await user.click(deleteBtn);
    expect(store.getState().editor.backgroundImage.src).toBeNull();
  });
});

// ─── Selection ────────────────────────────────────────────────────────────────

describe('LayersPanel — selection', () => {
  it('selects element on click and applies layer-selected class', async () => {
    const user = userEvent.setup();
    const store = makeStore();
    store.dispatch(addElement({ type: 'text', x: 0, y: 0, width: 200, name: 'Текст' }));
    // Deselect by setting selectedId to null
    store.dispatch({ type: 'editor/setSelectedId', payload: null });
    renderPanel(store);

    const item = document.querySelector('.layer-item');
    await user.click(item);
    const id = store.getState().editor.elements[0].id;
    expect(store.getState().editor.selectedId).toBe(id);
  });

  it('applies layer-selected class to selected element', () => {
    const store = makeStore();
    store.dispatch(addElement({ type: 'text', x: 0, y: 0, width: 200, name: 'Текст' }));
    renderPanel(store);
    // selectedId is set by addElement automatically
    const item = document.querySelector('.layer-item');
    expect(item.classList.contains('layer-selected')).toBe(true);
  });

  it('selects background image on click', async () => {
    const user = userEvent.setup();
    const store = makeStore();
    store.dispatch(setBackgroundImage({ src: 'data:image/jpeg;base64,xyz', x: 0, y: 0, width: 800, height: 400, rotation: 0 }));
    renderPanel(store);

    const bgItem = document.querySelector('.layer-bg-item');
    await user.click(bgItem);
    expect(store.getState().editor.selectedId).toBe('__bg_image__');
  });
});

// ─── Layer order ──────────────────────────────────────────────────────────────

describe('LayersPanel — layer order display', () => {
  it('shows elements in reversed order (top element first in list)', () => {
    const store = makeStore();
    store.dispatch(addElement({ type: 'text', x: 0, y: 0, width: 200, name: 'Bottom' }));
    store.dispatch(addElement({ type: 'text', x: 0, y: 0, width: 200, name: 'Top' }));
    renderPanel(store);

    const items = document.querySelectorAll('.layer-item');
    expect(items[0].textContent).toContain('Top');
    expect(items[1].textContent).toContain('Bottom');
  });
});
