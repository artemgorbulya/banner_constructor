import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addElement, setBackgroundImage, selectCanvasSize } from '../../store/editorSlice';
import { storeImage, resolveImage } from '../../lib/imageRegistry';
import { LIBRARY } from '../../lib/library';
import { X, Upload } from 'lucide-react';

function loadImageSize(src) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve({ w: img.naturalWidth || 100, h: img.naturalHeight || 100 });
    img.onerror = reject;
    img.src = src;
  });
}

export default function ImageModal({ mode, onClose }) {
  const dispatch = useDispatch();
  const canvasSize = useSelector(selectCanvasSize);
  const [tab, setTab] = useState('upload');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [libPreview, setLibPreview] = useState(null); // { src, x, y }
  const fileRef = useRef(null);

  function showPreview(e, src) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pw = 300;
    const ph = 300;
    let x = rect.right + 10;
    let y = rect.top;
    if (x + pw > window.innerWidth - 8) x = rect.left - pw - 10;
    if (y + ph > window.innerHeight - 8) y = window.innerHeight - ph - 8;
    setLibPreview({ src, x, y });
  }

  // Only show categories that have items
  const visibleCats = LIBRARY.filter(c => c.items.length > 0);
  const [catId, setCatId] = useState(visibleCats[0]?.id ?? 'icons');
  const activeCat = visibleCats.find(c => c.id === catId) ?? visibleCats[0];

  async function placeImage(rawSrc, name) {
    setError('');
    setLoading(true);
    const src = storeImage(rawSrc);
    try {
      const { w, h } = await loadImageSize(resolveImage(src));

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
          name: name || 'Зображення',
        }));
      }
      onClose();
    } catch {
      setError('Не вдалося завантажити зображення');
      setLoading(false);
    }
  }

  function fileBaseName(file) {
    return file.name.replace(/\.[^.]+$/, '');
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    // Reset so picking the same file again (e.g. after an error) still fires onChange
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => placeImage(ev.target.result, fileBaseName(file));
    reader.readAsDataURL(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => placeImage(ev.target.result, fileBaseName(file));
    reader.readAsDataURL(file);
  }

  function handleUrl() {
    const raw = url.trim();
    if (!raw) return;
    const src = raw.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(raw)}` : raw;
    const urlName = raw.split('/').pop().split('?')[0].replace(/\.[^.]+$/, '') || 'Зображення';
    placeImage(src, urlName);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>{mode === 'background' ? 'Фонове зображення' : 'Додати зображення'}</span>
          <button className="btn btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Main tabs: Upload / URL / Library */}
        <div className="modal-tabs">
          {['upload', 'url', 'library'].map(t => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'tab-active' : ''}`}
              onClick={() => { setTab(t); setError(''); }}
            >
              {{ upload: 'Завантажити', url: 'URL', library: 'Бібліотека' }[t]}
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
                onChange={e => { setUrl(e.target.value); setError(''); }}
                className="text-input"
              />
              {error && <p className="error-msg">{error}</p>}
              <button className="btn btn-primary" onClick={handleUrl}>Завантажити</button>
            </div>
          )}

          {!loading && error && tab !== 'url' && (
            <p className="error-msg" style={{ textAlign: 'center', marginTop: 8 }}>{error}</p>
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
                      onClick={() => placeImage(item.src, item.name)}
                      onMouseEnter={e => showPreview(e, item.src)}
                      onMouseLeave={() => setLibPreview(null)}
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

      {libPreview && (
        <div
          className="lib-preview-popup"
          style={{ left: libPreview.x, top: libPreview.y }}
        >
          <img src={libPreview.src} alt="preview" />
        </div>
      )}
    </div>
  );
}
