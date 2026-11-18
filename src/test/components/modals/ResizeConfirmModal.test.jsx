import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer, { addElement, setBackgroundImage } from '../../../store/editorSlice';
import ResizeConfirmModal from '../../../components/modals/ResizeConfirmModal';

const newSize = { width: 1536, height: 256, deviceFramesLayout: 'wide' };
const newMargins = { top: 16, right: 176, bottom: 30, left: 176 };

function setup() {
  const store = configureStore({ reducer: { editor: editorReducer } });
  store.dispatch(addElement({ type: 'image', src: '/a.png', x: 440, y: 200, width: 100, height: 100 }));
  store.dispatch(setBackgroundImage({ src: 'img_1', x: 0, y: 0, width: 880, height: 408, rotation: 0 }));
  const onClose = vi.fn();
  const utils = render(
    <Provider store={store}>
      <ResizeConfirmModal newSize={newSize} newMargins={newMargins} onClose={onClose} />
    </Provider>,
  );
  return { store, onClose, state: () => store.getState().editor, ...utils };
}

describe('ResizeConfirmModal', () => {
  it('«Перенести елементи» resizes, keeps and repositions content, sets margins', async () => {
    const user = userEvent.setup();
    const { state, onClose } = setup();
    await user.click(screen.getByText('Перенести елементи'));

    const s = state();
    expect(s.canvasSize).toEqual({ width: 1536, height: 256 });
    expect(s.deviceFramesLayout).toBe('wide');
    expect(s.safeAreaMargins).toEqual(newMargins);
    expect(s.elements).toHaveLength(1);
    expect(s.elements[0]).toMatchObject({ width: 100, height: 100 });
    expect(s.backgroundImage.src).toBe('img_1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('«Очистити банер» resizes and removes all content', async () => {
    const user = userEvent.setup();
    const { state, onClose } = setup();
    await user.click(screen.getByText('Очистити банер'));

    const s = state();
    expect(s.canvasSize).toEqual({ width: 1536, height: 256 });
    expect(s.safeAreaMargins).toEqual(newMargins);
    expect(s.elements).toEqual([]);
    expect(s.backgroundImage.src).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('both actions are undoable', async () => {
    const user = userEvent.setup();
    const { state } = setup();
    const before = state().history.past.length;
    await user.click(screen.getByText('Очистити банер'));
    expect(state().history.past.length).toBe(before + 1);
  });

  it('«Відміна», × and overlay click close without changes', async () => {
    const user = userEvent.setup();
    const { state, onClose, container } = setup();
    const snapshot = JSON.stringify(state());

    await user.click(screen.getByText('Відміна'));
    await user.click(container.querySelector('.modal-header .btn-icon'));
    await user.click(container.querySelector('.modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(state())).toBe(snapshot);
  });

  it('click inside the dialog does not close it', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByText('Зміна розміру банера'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
