import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X } from 'lucide-react';
import { setBackgroundImage, selectCanvasSize } from '../../store/editorSlice';
import { generateBackground } from '../../lib/aiGenerate';

const LS_KEY = 'gemini_api_key';

function loadImageSize(src) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve({ w: img.naturalWidth || 100, h: img.naturalHeight || 100 });
    img.onerror = reject;
    img.src = src;
  });
}

export default function AiGenerateModal({ onClose }) {
  const dispatch = useDispatch();
  const canvasSize = useSelector(selectCanvasSize);

  const savedKey = localStorage.getItem(LS_KEY) ?? '';
  const [apiKey, setApiKey] = useState(savedKey);
  const [keyDraft, setKeyDraft] = useState(savedKey);
  const [showKeyInput, setShowKeyInput] = useState(!savedKey);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [error, setError] = useState('');

  function handleSaveKey() {
    const k = keyDraft.trim();
    if (!k) return;
    localStorage.setItem(LS_KEY, k);
    setApiKey(k);
    setShowKeyInput(false);
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError('');
    setPreviewSrc(null);
    try {
      const src = await generateBackground(apiKey, prompt.trim());
      setPreviewSrc(src);
    } catch (e) {
      const msg = e.message ?? '';
      setError(msg === 'QUOTA'
        ? 'Перевищено ліміт free tier.\nУвімкніть білінг на ai.google.dev та повторіть спробу.'
        : msg || 'Помилка генерації. Перевірте API ключ та промпт.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleApply() {
    if (!previewSrc) return;
    const { w, h } = await loadImageSize(previewSrc);
    const s = Math.max(canvasSize.width / w, canvasSize.height / h);
    const fw = Math.round(w * s);
    const fh = Math.round(h * s);
    dispatch(setBackgroundImage({
      src: previewSrc,
      x: Math.round((canvasSize.width - fw) / 2),
      y: Math.round((canvasSize.height - fh) / 2),
      width: fw, height: fh, rotation: 0,
    }));
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>Генерація фону через AI</span>
          <button className="btn btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {showKeyInput ? (
          <>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">API ключ Google AI Studio</label>
                <input
                  type="password"
                  className="text-input"
                  placeholder="AIza..."
                  value={keyDraft}
                  onChange={e => setKeyDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
                  autoFocus
                />
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="ai-key-link">
                  Отримати ключ на aistudio.google.com →
                </a>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={onClose}>Скасувати</button>
              <button className="btn btn-primary" onClick={handleSaveKey} disabled={!keyDraft.trim()}>
                Зберегти ключ
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Опис фону</label>
                <textarea
                  className="text-input text-area-small"
                  rows={3}
                  placeholder="Синій абстрактний градієнт з хвилями, мінімалістичний стиль..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleGenerate()}
                />
              </div>

              <div className="ai-preview-area">
                {generating && <div className="ai-skeleton" />}
                {!generating && previewSrc && (
                  <img src={previewSrc} alt="Згенерований фон" crossOrigin="anonymous" />
                )}
                {!generating && !previewSrc && !error && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    Прев'ю з'явиться після генерації
                  </span>
                )}
                {!generating && error && (
                  <div style={{ padding: 12, textAlign: 'center' }}>
                    <p className="error-msg" style={{ whiteSpace: 'pre-line' }}>{error}</p>
                    {error.includes('білінг') && (
                      <a href="https://ai.google.dev" target="_blank" rel="noopener noreferrer" className="ai-key-link" style={{ marginTop: 8 }}>
                        Відкрити Google AI Studio →
                      </a>
                    )}
                  </div>
                )}
              </div>

              <button className="ai-change-key" onClick={() => setShowKeyInput(true)}>
                Змінити API ключ
              </button>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={onClose}>Скасувати</button>
              {previewSrc ? (
                <>
                  <button className="btn" onClick={handleGenerate} disabled={generating || !prompt.trim()}>
                    Перегенерувати
                  </button>
                  <button className="btn btn-primary" onClick={handleApply}>
                    Застосувати фон
                  </button>
                </>
              ) : (
                <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || !prompt.trim()}>
                  {generating ? 'Генерація…' : 'Згенерувати'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
