import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer from '../../../store/editorSlice';
import ProjectsModal from '../../../components/modals/ProjectsModal';

// Keep track of mocked projects state
vi.mock('../../../lib/projects', () => {
  let _projects = [];
  return {
    MAX_PROJECTS: 20,
    loadProjects: vi.fn(async () => [..._projects]),
    saveNewProject: vi.fn(async (name, state, thumb) => {
      if (_projects.length >= 20) throw new Error('LIMIT_REACHED');
      const p = { id: `id-${_projects.length}`, name: name || 'Без назви', savedAt: new Date().toISOString(), thumbnail: thumb, state };
      _projects.push(p);
      return { project: p, projects: [..._projects] };
    }),
    deleteProject: vi.fn(async (id) => {
      _projects = _projects.filter(p => p.id !== id);
      return [..._projects];
    }),
    generateThumbnail: vi.fn(() => 'data:image/jpeg;base64,THUMB'),
    syncAutoSave: vi.fn(),
    formatProjectDate: vi.fn(() => '15 Jan 2025'),
    exportProjectToFile: vi.fn(),
    importProjectFromFile: vi.fn(),
    __reset: () => { _projects = []; },
  };
});

import * as projectsLib from '../../../lib/projects';

function makeStore() {
  return configureStore({ reducer: { editor: editorReducer } });
}

function renderModal(props = {}) {
  const store = makeStore();
  const stageRef = { current: { width: vi.fn().mockReturnValue(880), toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,X') } };
  const defaults = { stageRef, onClose: vi.fn(), onAfterSave: undefined };
  render(
    <Provider store={store}>
      <ProjectsModal {...defaults} {...props} />
    </Provider>
  );
  return { store, stageRef };
}

beforeEach(() => {
  projectsLib.__reset();
  vi.clearAllMocks();
});

describe('ProjectsModal — list view', () => {
  it('shows loading state initially then empty state', async () => {
    renderModal();
    expect(screen.getByText('Завантаження…')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Немає збережених проектів')).toBeInTheDocument());
  });

  it('shows project counter', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText('0 / 20')).toBeInTheDocument());
  });

  it('calls onClose when Закрити is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderModal({ onClose });
    await waitFor(() => screen.getByText('Закрити'));
    await user.click(screen.getByText('Закрити'));
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking "Зберегти поточний" switches to save view', async () => {
    const user = userEvent.setup();
    renderModal();
    await waitFor(() => screen.getByText('Зберегти поточний'));
    await user.click(screen.getByText('Зберегти поточний'));
    expect(screen.getByText('Зберегти проект')).toBeInTheDocument();
  });
});

describe('ProjectsModal — save view', () => {
  it('opens in save view when initialView="save"', async () => {
    renderModal({ initialView: 'save' });
    await waitFor(() => expect(screen.getByText('Зберегти проект')).toBeInTheDocument());
  });

  it('saves project with entered name on button click', async () => {
    const user = userEvent.setup();
    renderModal({ initialView: 'save' });
    await waitFor(() => screen.getByPlaceholderText('Без назви'));
    await user.type(screen.getByPlaceholderText('Без назви'), 'My Project');
    await user.click(screen.getByText('Зберегти'));
    expect(projectsLib.saveNewProject).toHaveBeenCalledWith('My Project', expect.anything(), expect.anything());
  });

  it('saves with empty name (falls back to Без назви in lib)', async () => {
    const user = userEvent.setup();
    renderModal({ initialView: 'save' });
    await waitFor(() => screen.getByText('Зберегти'));
    await user.click(screen.getByText('Зберегти'));
    expect(projectsLib.saveNewProject).toHaveBeenCalledWith('', expect.anything(), expect.anything());
  });

  it('shows LIMIT_REACHED error when at capacity', async () => {
    // Fill to 20
    for (let i = 0; i < 20; i++) {
      await projectsLib.saveNewProject(`P${i}`, {}, null);
    }
    const user = userEvent.setup();
    renderModal({ initialView: 'save' });
    await waitFor(() => screen.getByText('Зберегти'));
    await user.click(screen.getByText('Зберегти'));
    await waitFor(() => expect(screen.getByText(/Досягнуто ліміт/)).toBeInTheDocument());
  });

  it('pressing Enter in name input saves the project', async () => {
    const user = userEvent.setup();
    renderModal({ initialView: 'save' });
    await waitFor(() => screen.getByPlaceholderText('Без назви'));
    await user.type(screen.getByPlaceholderText('Без назви'), 'Enter Save{Enter}');
    await waitFor(() => expect(projectsLib.saveNewProject).toHaveBeenCalled());
  });
});
