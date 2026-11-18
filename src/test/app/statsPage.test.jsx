import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { list, get } from '@vercel/blob';
import StatsPage from '../../app/stats/page';

vi.mock('@vercel/blob', () => ({ list: vi.fn(), get: vi.fn() }));

const NOW = Date.UTC(2026, 10, 19, 10, 0); // 19.11.2026 12:00 Kyiv

function blob(pathname) { return { pathname }; }
function jsonStream(obj) {
  return new Response(JSON.stringify(obj)).body;
}

async function renderPage() {
  render(await StatsPage());
}

describe('/stats page', () => {
  beforeEach(() => {
    list.mockReset();
    get.mockReset();
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'test-token');
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('explains how to set up when Blob is not configured', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
    await renderPage();
    expect(screen.getByText(/Статистика не налаштована/)).toBeInTheDocument();
    expect(list).not.toHaveBeenCalled();
  });

  it('shows an empty state when there are no exports', async () => {
    list.mockResolvedValue({ blobs: [], hasMore: false });
    await renderPage();
    expect(screen.getByText('Поки що жодного експорту.')).toBeInTheDocument();
    expect(screen.getByText('Всього експортів').nextSibling.textContent).toBe('0');
  });

  it('renders totals, breakdowns and recent banners newest first', async () => {
    const older = NOW - 86_400_000;
    list.mockResolvedValue({
      blobs: [
        blob(`stats/${older}__billboard__1536x256__jpg-abc.json`),
        blob(`stats/${NOW}__web-banner__880x408__png-def.json`),
        blob('stats/garbage.txt'),
      ],
      hasMore: false,
    });
    get.mockImplementation(async pathname => ({
      stream: jsonStream(pathname.includes('web-banner')
        ? { counts: { text: 2, image: 1, colorBlock: 0 }, texts: ['Знижки -50%'], thumbnail: 'data:image/jpeg;base64,AAA' }
        : { counts: { text: 0, image: 1, colorBlock: 1 }, texts: [], thumbnail: null }),
    }));

    await renderPage();

    expect(screen.getByText('Всього експортів').nextSibling.textContent).toBe('2');
    expect(get).toHaveBeenCalledWith(expect.stringContaining('web-banner'), { access: 'private' });

    const items = document.querySelectorAll('.stats-item');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Web Banner · 880×408 · PNG');
    expect(items[0].textContent).toContain('Текст: 2 · Зображення: 1 · Блоки: 0');
    expect(items[0].querySelector('img').getAttribute('src')).toBe('data:image/jpeg;base64,AAA');
    expect(screen.getByText('Знижки -50%')).toBeInTheDocument();
    expect(items[1].textContent).toContain('Billboard · 1536×256 · JPG');
    expect(items[1].textContent).toContain("без прев'ю");
  });

  it('follows pagination cursors when listing', async () => {
    list
      .mockResolvedValueOnce({ blobs: [blob(`stats/${NOW}__custom__100x100__png.json`)], hasMore: true, cursor: 'c1' })
      .mockResolvedValueOnce({ blobs: [blob(`stats/${NOW - 1}__custom__100x100__png.json`)], hasMore: false });
    get.mockResolvedValue({ stream: jsonStream({}) });
    await renderPage();
    expect(list).toHaveBeenCalledTimes(2);
    expect(list.mock.calls[1][0]).toMatchObject({ cursor: 'c1' });
    expect(screen.getByText('Всього експортів').nextSibling.textContent).toBe('2');
  });

  it('still lists an export whose JSON cannot be read', async () => {
    list.mockResolvedValue({ blobs: [blob(`stats/${NOW}__web-banner__880x408__png.json`)], hasMore: false });
    get.mockRejectedValue(new Error('gone'));
    await renderPage();
    expect(document.querySelector('.stats-item').textContent).toContain('Web Banner · 880×408 · PNG');
  });

  it('shows an error when listing fails', async () => {
    list.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.getByText('Не вдалося завантажити статистику зі сховища.')).toBeInTheDocument();
  });
});
