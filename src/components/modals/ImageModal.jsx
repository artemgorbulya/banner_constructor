import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addElement, setBackgroundImage, selectCanvasSize } from '../../store/editorSlice';
import { LIBRARY } from '../../lib/library';
import { X, Upload, Scissors, RotateCcw } from 'lucide-react';

function loadImageSize(src) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve({ w: img.naturalWidth || 100, h: img.naturalHeight || 100 });
    img.onerror = reject;
    img.src = src;
  });
}

function RemoveBgTab({ onPlace }) {
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem('removebg_api_key') ?? ''; } catch { return ''; }
  });
  const [inputMode, setInputMode] = useState('file');
  const [url, setUrl] = useState('');
  const [sourceBase64, setSourceBase64] = useState(null);
  const [result, setResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  function saveKey(k) {
    setApiKey(k);
    try { localStorage.setItem('removebg_api_key', k); } catch {/* ignore */}
  }

  function readFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => { setSourceBase64(ev.target.result); setResult(null); setError(''); };
    reader.readAsDataURL(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    readFile(e.dataTransfer.files?.[0]);
  }

  async function process() {
    if (!apiKey.trim()) { setError('Введіть API ключ'); return; }
    if (inputMode === 'file' && !sourceBase64) { setError('Виберіть зображення'); return; }
    if (inputMode === 'url' && !url.trim()) { setError('Введіть URL зображення'); return; }

    setProcessing(true);
    setError('');
    setResult(null);

    try {
      const body = inputMode === 'file'
        ? { imageBase64: sourceBase64, apiKey: apiKey.trim() }
        : { imageUrl: url.trim(), apiKey: apiKey.trim() };

      const res = await fetch('/api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Помилка обробки');
      setResult(data.image);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  }

  function reset() {
    setResult(null);
    setSourceBase64(null);
    setUrl('');
    setError('');
  }

  const hasKey = apiKey.trim().length > 0;

  return (
    <div className="removebg-panel">
      {!hasKey ? (
        <div className="removebg-stub">
          <div className="removebg-icon">✂️</div>
          <h3 className="removebg-title">Вирізання фону</h3>
          <p className="removebg-desc">
            Скористайтесь безкоштовним сервісом <strong>remove.bg</strong> — він автоматично видаляє фон із зображення за допомогою ШІ:
          </p>
          <ol className="removebg-steps">
            <li>Отримайте безкоштовний API ключ на remove.bg</li>
            <li>Введіть його в поле нижче</li>
            <li>Завантажте зображення або вкажіть URL</li>
            <li>Натисніть «Видалити фон» — PNG із прозорістю одразу додасться на банер</li>
          </ol>
          <div className="removebg-stub-btns">
            <a
              href="https://www.remove.bg/uk/upload"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary removebg-link"
            >
              Відкрити remove.bg →
            </a>
            <a
              href="https://www.remove.bg/dashboard#api-key"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost removebg-link"
            >
              Отримати API ключ →
            </a>
          </div>
          <div className="removebg-key-row-inline">
            <input
              type="password"
              placeholder="Вже маєте ключ? Введіть тут"
              value={apiKey}
              onChange={e => saveKey(e.target.value)}
              className="text-input removebg-key-input-inline"
            />
          </div>
          <p className="removebg-quota-hint">Безкоштовно: 50 викликів на місяць</p>
        </div>
      ) : (
        <>
          <div className="removebg-key-row">
            <label className="removebg-key-label">API ключ remove.bg</label>
            <div className="removebg-key-inputs">
              <input
                type="password"
                placeholder="Введіть ваш API ключ"
                value={apiKey}
                onChange={e => saveKey(e.target.value)}
                className="text-input removebg-key-input"
              />
              <a
                href="https://www.remove.bg/dashboard#api-key"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost removebg-key-link"
              >
                Отримати ключ
              </a>
            </div>
            <p className="removebg-quota-hint">Безкоштовно: 50 викликів на місяць</p>
          </div>

          {!result && (
            <>
              <div className="removebg-mode-tabs">
                {['file', 'url'].map(m => (
                  <button
                    key={m}
                    className={`tab-btn ${inputMode === m ? 'tab-active' : ''}`}
                    onClick={() => { setInputMode(m); setError(''); }}
                  >
                    {m === 'file' ? 'Файл' : 'URL'}
                  </button>
                ))}
              </div>

              {inputMode === 'file' && (
                <div
                  className={`upload-area upload-area-sm ${dragging ? 'upload-area-drag' : ''} ${sourceBase64 ? 'upload-area-filled' : ''}`}
                  onClick={() => !sourceBase64 && fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragEnter={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => readFile(e.target.files?.[0])}
                  />
                  {sourceBase64 ? (
                    <div className="removebg-source-preview">
                      <img src={sourceBase64} className="removebg-preview-img" alt="джерело" />
                      <button
                        className="btn btn-icon removebg-clear-btn"
                        onClick={e => { e.stopPropagation(); setSourceBase64(null); setError(''); }}
                        title="Очистити"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload size={28} strokeWidth={1.5} />
                      <p>Перетягніть або виберіть файл</p>
                    </>
                  )}
                </div>
              )}

              {inputMode === 'url' && (
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={url}
                  onChange={e => { setUrl(e.target.value); setError(''); }}
                  className="text-input removebg-url-input"
                />
              )}

              {error && <p className="error-msg">{error}</p>}

              <button
                className="btn btn-primary removebg-process-btn"
                onClick={process}
                disabled={processing}
              >
                {processing
                  ? <><span className="removebg-spinner" />Обробка…</>
                  : <><Scissors size={14} />Видалити фон</>
                }
              </button>
            </>
          )}

      {result && (
        <div className="removebg-result">
          <div className="removebg-checkered">
            <img src={result} className="removebg-result-img" alt="результат" />
          </div>
          <div className="removebg-result-actions">
            <button className="btn btn-ghost" onClick={reset}>
              <RotateCcw size={14} /> Спробувати інше
            </button>
            <button className="btn btn-primary" onClick={() => onPlace(result)}>
              Додати на банер
            </button>
          </div>
        </div>
      )}
    </>
    )}
    </div>
  );
}

export default function ImageModal({ mode, onClose }) {
  const dispatch = useDispatch();
  const canvasSize = useSelector(selectCanvasSize);
  const [tab, setTab] = useState('upload');
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  // Only show categories that have items
  const visibleCats = LIBRARY.filter(c => c.items.length > 0);
  const [catId, setCatId] = useState(visibleCats[0]?.id ?? 'icons');
  const activeCat = visibleCats.find(c => c.id === catId) ?? visibleCats[0];

  async function placeImage(src) {
    setLoading(true);
    try {
      const { w, h } = await loadImageSize(src);

      if (mode === 'background') {
        const scaleX = canvasSize.width / w;
        const scaleY = canvasSize.height / h;
        const s = Math.max(scaleX, scaleY);
        const fw = Math.round(w * s);
        const fh = Math.round(h * s);
        dispatch(setBackgroundImage({
          src,
          x: Math.round((canvasSize.width - fw) / 2),
          y: Math.round((canvasSize.height - fh) / 2),
          width: fw, height: fh,
          rotation: 0,
        }));
      } else {
        const maxW = canvasSize.width * 0.6;
        const maxH = canvasSize.height * 0.6;
        const s = Math.min(1, maxW / w, maxH / h);
        const fw = Math.round(w * s);
        const fh = Math.round(h * s);
        dispatch(addElement({
          type: 'image', src,
          x: Math.round((canvasSize.width - fw) / 2),
          y: Math.round((canvasSize.height - fh) / 2),
          width: fw, height: fh,
          name: 'Зображення',
        }));
      }
      onClose();
    } catch {
      setUrlError('Не вдалося завантажити зображення');
      setLoading(false);
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => placeImage(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => placeImage(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleUrl() {
    const raw = url.trim();
    if (!raw) return;
    setUrlError('');
    const src = raw.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(raw)}` : raw;
    placeImage(src);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>{mode === 'background' ? 'Фонове зображення' : 'Додати зображення'}</span>
          <button className="btn btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Main tabs: Upload / URL / Library / Remove BG */}
        <div className="modal-tabs">
          {['upload', 'url', 'library', 'removebg'].map(t => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'tab-active' : ''}`}
              onClick={() => setTab(t)}
            >
              {{ upload: 'Завантажити', url: 'URL', library: 'Бібліотека', removebg: 'Вирізання фону' }[t]}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Завантаження…</p>}

          {!loading && tab === 'upload' && (
            <div
              className={`upload-area ${dragging ? 'upload-area-drag' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragEnter={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              <div className="upload-icon"><Upload size={40} strokeWidth={1.5} /></div>
              <p>Натисніть або перетягніть файл (JPG, PNG, SVG, GIF, WebP)</p>
            </div>
          )}

          {!loading && tab === 'url' && (
            <div className="url-form">
              <input
                type="url"
                placeholder="https://example.com/image.png"
                value={url}
                onChange={e => { setUrl(e.target.value); setUrlError(''); }}
                className="text-input"
              />
              {urlError && <p className="error-msg">{urlError}</p>}
              <button className="btn btn-primary" onClick={handleUrl}>Завантажити</button>
            </div>
          )}

          {!loading && tab === 'removebg' && (
            <RemoveBgTab onPlace={placeImage} />
          )}

          {!loading && tab === 'library' && (
            <>
              {/* Category sub-tabs */}
              {visibleCats.length > 1 && (
                <div className="lib-cats">
                  {visibleCats.map(cat => (
                    <button
                      key={cat.id}
                      className={`lib-cat-btn ${catId === cat.id ? 'lib-cat-active' : ''}`}
                      onClick={() => setCatId(cat.id)}
                    >
                      {cat.label}
                      <span className="lib-cat-count">{cat.items.length}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeCat && activeCat.items.length > 0 ? (
                <div className="library-grid">
                  {activeCat.items.map(item => (
                    <button
                      key={item.name}
                      className="library-item"
                      onClick={() => placeImage(item.src)}
                    >
                      <img src={item.src} alt={item.name} />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="lib-empty">
                  <p>Категорія порожня</p>
                  <p className="lib-empty-hint">
                    Додайте файли до <code>public/library/</code> і пропишіть їх у <code>src/lib/library.js</code>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
