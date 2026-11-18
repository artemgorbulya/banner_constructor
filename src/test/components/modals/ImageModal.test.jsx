import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer from '../../../store/editorSlice';
import ImageModal from '../../../components/modals/ImageModal';

const tab = name => screen.getAllByRole('button').find(b => b.classList.contains('tab-btn') && b.textContent === name);

function renderModal(mode = 'element') {
  const store = configureStore({ reducer: { editor: editorReducer } });
  render(<Provider store={store}><ImageModal mode={mode} onClose={vi.fn()} /></Provider>);
}

describe('ImageModal — tabs', () => {
  it('shows Завантажити, URL and Бібліотека tabs only (no background removal)', () => {
    renderModal();
    const tabs = screen.getAllByRole('button').filter(b => b.classList.contains('tab-btn'));
    expect(tabs.map(t => t.textContent)).toEqual(['Завантажити', 'URL', 'Бібліотека']);
    expect(screen.queryByText('Вирізання фону')).toBeNull();
  });

  it('switches between remaining tabs', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(tab('URL'));
    expect(screen.getByPlaceholderText('https://example.com/image.png')).toBeInTheDocument();
    await user.click(tab('Завантажити'));
    expect(screen.getByText(/Натисніть або перетягніть файл/)).toBeInTheDocument();
  });

  it('uses background title in background mode', () => {
    renderModal('background');
    expect(screen.getByText('Фонове зображення')).toBeInTheDocument();
  });
});

describe('ImageModal — image load errors', () => {
  // window.Image stub: every load fails (corrupt / unsupported file, broken URL)
  let OrigImage;
  beforeEach(() => {
    OrigImage = window.Image;
    window.Image = class { set src(_) { setTimeout(() => this.onerror?.(new Error('bad')), 0); } };
  });
  afterEach(() => { window.Image = OrigImage; });

  const ERR = 'Не вдалося завантажити зображення';

  it('shows the error on the Завантажити tab when an uploaded file fails to load', async () => {
    const user = userEvent.setup();
    const { container } = renderModalWithContainer();
    const input = container.querySelector('input[type="file"]');
    await user.upload(input, new File(['x'], 'broken.png', { type: 'image/png' }));
    expect(await screen.findByText(ERR)).toBeInTheDocument();
    expect(input.value).toBe(''); // same file can be picked again
  });

  it('shows the error on the URL tab and clears it when switching tabs', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(tab('URL'));
    await user.type(screen.getByPlaceholderText('https://example.com/image.png'), '/broken.png');
    await user.click(screen.getAllByText('Завантажити').find(b => !b.classList.contains('tab-btn')));
    expect(await screen.findByText(ERR)).toBeInTheDocument();
    expect(screen.getAllByText(ERR)).toHaveLength(1);

    await user.click(tab('Бібліотека'));
    expect(screen.queryByText(ERR)).toBeNull();
  });

  it('does not add an element when loading fails', async () => {
    const user = userEvent.setup();
    const store = configureStore({ reducer: { editor: editorReducer } });
    const onClose = vi.fn();
    const { container } = render(<Provider store={store}><ImageModal mode="element" onClose={onClose} /></Provider>);
    await user.upload(container.querySelector('input[type="file"]'), new File(['x'], 'a.png', { type: 'image/png' }));
    await screen.findByText(ERR);
    expect(store.getState().editor.elements).toEqual([]);
    expect(onClose).not.toHaveBeenCalled();
  });
});

function renderModalWithContainer(mode = 'element') {
  const store = configureStore({ reducer: { editor: editorReducer } });
  return render(<Provider store={store}><ImageModal mode={mode} onClose={vi.fn()} /></Provider>);
}
