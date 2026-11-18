import { list, get } from '@vercel/blob';
import { STATS_PREFIX, parseStatsPath, summarize, blobAccess } from '../../lib/stats';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Статистика — Banner Constructor' };

const RECENT_LIMIT = 50;

async function listAllEntries() {
  const entries = [];
  let cursor;
  do {
    const res = await list({ prefix: STATS_PREFIX, cursor, limit: 1000 });
    for (const b of res.blobs) {
      const parsed = parseStatsPath(b.pathname);
      if (parsed) entries.push({ ...parsed, pathname: b.pathname });
    }
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);
  return entries.sort((a, b) => b.ts - a.ts);
}

async function readEvent(pathname) {
  try {
    const res = await get(pathname, { access: blobAccess() });
    if (!res?.stream) return null;
    return JSON.parse(await new Response(res.stream).text());
  } catch {
    return null;
  }
}

const fmtDateTime = ts => new Date(ts).toLocaleString('uk-UA', {
  timeZone: 'Europe/Kyiv', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const fmtDay = day => new Date(`${day}T12:00:00Z`).toLocaleDateString('uk-UA', {
  timeZone: 'Europe/Kyiv', weekday: 'short', day: '2-digit', month: '2-digit',
});

function Shell({ children }) {
  return (
    <div className="stats-page">
      <div className="stats-inner">
        <header className="stats-header">
          <h1>Статистика використання</h1>
          <a href="/" className="btn btn-ghost">← До конструктора</a>
        </header>
        {children}
      </div>
    </div>
  );
}

function Breakdown({ title, data }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div className="stats-card">
      <div className="stats-card-title">{title}</div>
      {rows.length === 0 ? <div className="stats-muted">—</div> : (
        <table className="stats-table">
          <tbody>
            {rows.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default async function StatsPage() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return (
      <Shell>
        <p className="stats-muted">
          Статистика не налаштована: немає змінної <code>BLOB_READ_WRITE_TOKEN</code>.
          Підключіть Vercel Blob до проєкту (Storage → Blob).
        </p>
      </Shell>
    );
  }

  let entries;
  try {
    entries = await listAllEntries();
  } catch {
    return <Shell><p className="error-msg">Не вдалося завантажити статистику зі сховища.</p></Shell>;
  }

  const summary = summarize(entries);
  const recent = await Promise.all(
    entries.slice(0, RECENT_LIMIT).map(async e => ({ ...e, ...(await readEvent(e.pathname)) })),
  );
  const maxDay = Math.max(1, ...summary.byDay.map(d => d.count));

  return (
    <Shell>
      <section className="stats-summary">
        <div className="stats-card stats-total">
          <div className="stats-card-title">Всього експортів</div>
          <div className="stats-total-value">{summary.total}</div>
        </div>
        <Breakdown title="За розміром" data={summary.byPreset} />
        <Breakdown title="За форматом" data={summary.byFormat} />
        <div className="stats-card stats-days">
          <div className="stats-card-title">Останні 14 днів</div>
          {summary.byDay.map(d => (
            <div key={d.day} className="stats-day-row">
              <span className="stats-day-label">{fmtDay(d.day)}</span>
              <span className="stats-day-bar"><span style={{ width: `${(d.count / maxDay) * 100}%` }} /></span>
              <span className="stats-day-count">{d.count}</span>
            </div>
          ))}
        </div>
      </section>

      <h2 className="stats-subtitle">
        Останні банери{entries.length > RECENT_LIMIT ? ` (${RECENT_LIMIT} з ${entries.length})` : ''}
      </h2>
      {recent.length === 0 ? (
        <p className="stats-muted">Поки що жодного експорту.</p>
      ) : (
        <div className="stats-grid">
          {recent.map(e => (
            <article key={e.pathname} className="stats-item">
              <div className="stats-thumb">
                {e.thumbnail
                  ? <img src={e.thumbnail} alt={`${e.preset} ${e.width}×${e.height}`} />
                  : <span className="stats-muted">без прев&apos;ю</span>}
              </div>
              <div className="stats-item-body">
                <div className="stats-item-date">{fmtDateTime(e.ts)}</div>
                <div className="stats-item-meta">
                  {e.preset} · {e.width}×{e.height} · {e.format.toUpperCase()}
                </div>
                {e.counts && (
                  <div className="stats-muted">
                    Текст: {e.counts.text} · Зображення: {e.counts.image} · Блоки: {e.counts.colorBlock}
                  </div>
                )}
                {e.texts?.length > 0 && (
                  <ul className="stats-texts">
                    {e.texts.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </Shell>
  );
}
