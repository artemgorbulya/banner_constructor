import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer, { addElement, updateElement } from '../../../store/editorSlice';
import ExportModal from '../../../components/modals/ExportModal';
import { exportBanner } from '../../../lib/export';
import { trackExport } from '../../../lib/stats';

vi.mock('../../../lib/export', () => ({ exportBanner: vi.fn() }));
vi.mock('../../../lib/stats', async () => ({
  ...(await vi.importActual('../../../lib/stats')),
  trackExport: vi.fn(),
}));

let store;
function render(ui) {
  return rtlRender(<Provider store={store}>{ui}</Provider>);
}

function makeStageRef() {
  return {
    current: {
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,FAKE'),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  store = configureStore({ reducer: { editor: editorReducer } });
});

describe('ExportModal', () => {
  it('renders without crash', () => {
    render(<ExportModal stageRef={makeStageRef()} onClose={vi.fn()} />);
    expect(screen.getByText('Експорт банера')).toBeInTheDocument();
  });

  it('shows JPG quality slider only when JPG is selected', async () => {
    const user = userEvent.setup();
    render(<ExportModal stageRef={makeStageRef()} onClose={vi.fn()} />);
    expect(screen.queryByText(/Якість/)).toBeNull();
    await user.click(screen.getByLabelText(/JPG/));
    expect(screen.getByText(/Якість/)).toBeInTheDocument();
  });

  it('calls exportBanner and onClose on download click', async () => {
    const onClose = vi.fn();
    const stageRef = makeStageRef();
    const user = userEvent.setup();
    render(<ExportModal stageRef={stageRef} onClose={onClose} />);
    await user.click(screen.getByText('Завантажити'));
    expect(exportBanner).toHaveBeenCalledWith(stageRef, 'png', 0.9);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render "Зберегти як проект" when onSaveAsProject is not provided', () => {
    render(<ExportModal stageRef={makeStageRef()} onClose={vi.fn()} />);
    expect(screen.queryByText('Зберегти як проект')).toBeNull();
  });

  it('renders "Зберегти як проект" button and calls callback', async () => {
    const onSaveAsProject = vi.fn();
    const user = userEvent.setup();
    render(
      <ExportModal stageRef={makeStageRef()} onClose={vi.fn()} onSaveAsProject={onSaveAsProject} />
    );
    const btn = screen.getByText('Зберегти як проект');
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    expect(onSaveAsProject).toHaveBeenCalled();
  });

  it('calls onClose when Скасувати is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ExportModal stageRef={makeStageRef()} onClose={onClose} />);
    await user.click(screen.getByText('Скасувати'));
    expect(onClose).toHaveBeenCalled();
  });

  it('records usage statistics on download (preset, format, visible elements, thumbnail)', async () => {
    const user = userEvent.setup();
    store.dispatch(addElement({ type: 'text', text: 'Чорна п’ятниця', x: 0, y: 0, width: 100 }));
    store.dispatch(addElement({ type: 'image', src: '/a.png', x: 0, y: 0, width: 10, height: 10 }));
    const hiddenId = store.getState().editor.elements[1].id;
    store.dispatch(updateElement({ id: hiddenId, visible: false }));
    const stageRef = makeStageRef();
    stageRef.current.width = () => 880;

    render(<ExportModal stageRef={stageRef} onClose={vi.fn()} />);
    await user.click(screen.getByLabelText(/JPG/));
    await user.click(screen.getByText('Завантажити'));

    expect(trackExport).toHaveBeenCalledTimes(1);
    const ev = trackExport.mock.calls[0][0];
    expect(ev).toMatchObject({
      preset: 'Web Banner', width: 880, height: 408, format: 'jpg',
      counts: { text: 1, image: 0, colorBlock: 0 },
      texts: ['Чорна п’ятниця'],
    });
    expect(ev.thumbnail).toBe('data:image/png;base64,FAKE');
  });

  it('still downloads and closes when statistics throw', async () => {
    trackExport.mockImplementationOnce(() => { throw new Error('boom'); });
    const onClose = vi.fn();
    const stageRef = makeStageRef();
    const user = userEvent.setup();
    render(<ExportModal stageRef={stageRef} onClose={onClose} />);
    await user.click(screen.getByText('Завантажити'));
    expect(exportBanner).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
