import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { createElement } from 'react';
import editorReducer, { addElement } from '../../store/editorSlice';
import Toolbar from '../../components/Toolbar/Toolbar';

// Mock child modals to keep tests focused on Toolbar logic
vi.mock('../../components/modals/SizeModal', () => ({
  default: ({ onClose }) => <div data-testid="size-modal"><button onClick={onClose}>Close</button></div>,
}));
vi.mock('../../components/modals/ExportModal', () => ({
  default: ({ onClose }) => <div data-testid="export-modal"><button onClick={onClose}>Close</button></div>,
}));
vi.mock('../../components/modals/InfoModal', () => ({
  default: ({ onClose }) => <div data-testid="info-modal"><button onClick={onClose}>Close</button></div>,
}));
vi.mock('../../components/modals/ProjectsModal', () => ({
  default: ({ onClose }) => <div data-testid="projects-modal"><button onClick={onClose}>Close</button></div>,
}));

function makeStore() {
  return configureStore({ reducer: { editor: editorReducer } });
}

function renderToolbar(store = makeStore()) {
  const stageRef = { current: null };
  render(
    <Provider store={store}>
      <Toolbar stageRef={stageRef} />
    </Provider>
  );
  return store;
}

describe('Toolbar', () => {
  it('renders without crash', () => {
    renderToolbar();
    expect(screen.getByText('Новий')).toBeInTheDocument();
    expect(screen.getByText('Проекти')).toBeInTheDocument();
    expect(screen.getByText('Розмір')).toBeInTheDocument();
    expect(screen.getByText('Експорт')).toBeInTheDocument();
  });

  it('undo button is disabled when no history', () => {
    renderToolbar();
    const undoBtn = screen.getByTitle(/Скасувати/);
    expect(undoBtn).toBeDisabled();
  });

  it('undo button is enabled after an action', () => {
    const store = makeStore();
    store.dispatch(addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    renderToolbar(store);
    expect(screen.getByTitle(/Скасувати/)).not.toBeDisabled();
  });

  it('redo button is disabled when no future history', () => {
    renderToolbar();
    expect(screen.getByTitle(/Повторити/)).toBeDisabled();
  });

  it('clicking "Новий" opens confirm modal', async () => {
    const user = userEvent.setup();
    renderToolbar();
    await user.click(screen.getByText('Новий'));
    expect(screen.getByText('Новий проект')).toBeInTheDocument();
    expect(screen.getByText('Зберегти і створити новий')).toBeInTheDocument();
    expect(screen.getByText('Скинути без збереження')).toBeInTheDocument();
  });

  it('"Скинути без збереження" resets state and closes modal', async () => {
    const store = makeStore();
    store.dispatch(addElement({ type: 'text', x: 0, y: 0, width: 100 }));
    const user = userEvent.setup();
    renderToolbar(store);
    await user.click(screen.getByText('Новий'));
    await user.click(screen.getByText('Скинути без збереження'));
    expect(screen.queryByText('Новий проект')).toBeNull();
    expect(store.getState().editor.elements).toHaveLength(0);
  });

  it('clicking "Проекти" opens ProjectsModal', async () => {
    const user = userEvent.setup();
    renderToolbar();
    await user.click(screen.getByText('Проекти'));
    expect(screen.getByTestId('projects-modal')).toBeInTheDocument();
  });

  it('clicking "Розмір" opens SizeModal', async () => {
    const user = userEvent.setup();
    renderToolbar();
    await user.click(screen.getByText('Розмір'));
    expect(screen.getByTestId('size-modal')).toBeInTheDocument();
  });

  it('clicking "Експорт" opens ExportModal', async () => {
    const user = userEvent.setup();
    renderToolbar();
    await user.click(screen.getByText('Експорт'));
    expect(screen.getByTestId('export-modal')).toBeInTheDocument();
  });
});
