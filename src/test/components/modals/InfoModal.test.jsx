import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InfoModal from '../../../components/modals/InfoModal';

describe('InfoModal', () => {
  it('renders the help title and all sections', () => {
    const { container } = render(<InfoModal onClose={vi.fn()} />);
    expect(screen.getByText('Як користуватись конструктором')).toBeInTheDocument();
    expect(container.querySelectorAll('.info-section').length).toBeGreaterThan(0);
    container.querySelectorAll('.info-section').forEach(s => {
      expect(s.querySelectorAll('li').length).toBeGreaterThan(0);
    });
  });

  it('does not mention removed features', () => {
    const { container } = render(<InfoModal onClose={vi.fn()} />);
    const text = container.textContent;
    expect(text).not.toMatch(/AI Фон|Gemini|AI Studio/);
    expect(text).not.toMatch(/remove\.bg|Вирізання фону/);
  });

  it('closes via × and overlay, but not on inner click', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<InfoModal onClose={onClose} />);
    await user.click(screen.getByText('Як користуватись конструктором'));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(container.querySelector('.modal-header .btn-icon'));
    await user.click(container.querySelector('.modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
