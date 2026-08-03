import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer from '../../../store/editorSlice';
import SizeModal from '../../../components/modals/SizeModal';

vi.mock('../../../components/modals/ResizeConfirmModal', () => ({
  default: () => <div data-testid="resize-confirm-modal" />,
}));

function makeStore() {
  return configureStore({ reducer: { editor: editorReducer } });
}

function renderSizeModal(store = makeStore()) {
  render(
    <Provider store={store}>
      <SizeModal onClose={vi.fn()} />
    </Provider>
  );
  return store;
}

describe('SizeModal', () => {
  it('renders without crash and shows current canvas size', () => {
    renderSizeModal();
    expect(screen.getAllByRole('spinbutton')[0]).toHaveValue(880);
    expect(screen.getAllByRole('spinbutton')[1]).toHaveValue(408);
  });

  it('renders logo frame checkbox checked by default', () => {
    renderSizeModal();
    const checkbox = screen.getByLabelText(/Показувати рамку логотипа/);
    expect(checkbox).toBeChecked();
  });

  it('clicking logo frame checkbox dispatches toggleLogoFrame', async () => {
    const store = makeStore();
    const user = userEvent.setup();
    renderSizeModal(store);
    const checkbox = screen.getByLabelText(/Показувати рамку логотипа/);
    await user.click(checkbox);
    expect(store.getState().editor.logoFrameEnabled).toBe(false);
  });

  it('clicking logo frame checkbox again re-enables it', async () => {
    const store = makeStore();
    const user = userEvent.setup();
    renderSizeModal(store);
    const checkbox = screen.getByLabelText(/Показувати рамку логотипа/);
    await user.click(checkbox);
    await user.click(checkbox);
    expect(store.getState().editor.logoFrameEnabled).toBe(true);
  });

  it('renders device frames checkbox checked by default', () => {
    renderSizeModal();
    const checkbox = screen.getByLabelText(/Показувати рамки девайсів/);
    expect(checkbox).toBeChecked();
  });

  it('clicking device frames checkbox dispatches toggleDeviceFrames', async () => {
    const store = makeStore();
    const user = userEvent.setup();
    renderSizeModal(store);
    const checkbox = screen.getByLabelText(/Показувати рамки девайсів/);
    await user.click(checkbox);
    expect(store.getState().editor.deviceFramesEnabled).toBe(false);
  });

  it('"За замовчуванням" button resets margins to preset defaults', async () => {
    const user = userEvent.setup();
    const store = makeStore();
    renderSizeModal(store);
    // Change top margin
    const inputs = screen.getAllByRole('spinbutton');
    const topInput = inputs[2]; // top margin input
    await user.clear(topInput);
    await user.type(topInput, '99');
    await user.click(screen.getByText('За замовчуванням'));
    expect(topInput).not.toHaveValue(99);
  });

  it('calls onClose when Скасувати is clicked', async () => {
    const onClose = vi.fn();
    const store = makeStore();
    const user = userEvent.setup();
    render(<Provider store={store}><SizeModal onClose={onClose} /></Provider>);
    await user.click(screen.getByText('Скасувати'));
    expect(onClose).toHaveBeenCalled();
  });
});
