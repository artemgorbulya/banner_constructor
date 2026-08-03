import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportModal from '../../../components/modals/ExportModal';
import { exportBanner } from '../../../lib/export';

vi.mock('../../../lib/export', () => ({ exportBanner: vi.fn() }));

function makeStageRef() {
  return {
    current: {
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,FAKE'),
    },
  };
}

beforeEach(() => vi.clearAllMocks());

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
});
