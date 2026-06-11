import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addElement, setBackgroundImage, selectCanvasSize } from '../../store/editorSlice';
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
    if (!url.trim()) return;
    setUrlError('');
    placeImage(url.trim());
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
              onClick={() => setTab(t)}
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
                onChange={e => { setUrl(e.target.value); setUrlError(''); }}
                className="text-input"
              />
              {urlError && <p className="error-msg">{urlError}</p>}
              <button className="btn btn-primary" onClick={handleUrl}>Завантажити</button>
            </div>
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
