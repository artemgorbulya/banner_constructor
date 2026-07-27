import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCanvasSize, setCanvasSizeAndClear, setSafeAreaMargins, selectCanvasSize, selectSafeAreaMargins, selectElements, selectBackgroundImage } from '../../store/editorSlice';
import { PRESETS } from '../../lib/presets';
import { X } from 'lucide-react';
import ResizeConfirmModal from './ResizeConfirmModal';

export default function SizeModal({ onClose }) {
  const dispatch = useDispatch();
  const current = useSelector(selectCanvasSize);
  const currentMargins = useSelector(selectSafeAreaMargins);
  const elements = useSelector(selectElements);
  const backgroundImage = useSelector(selectBackgroundImage);

  const [w, setW] = useState(String(current.width));
  const [h, setH] = useState(String(current.height));
  const [resizeConfirm, setResizeConfirm] = useState(null);
  const [margins, setMargins] = useState({
    top: String(currentMargins.top),
    right: String(currentMargins.right),
    bottom: String(currentMargins.bottom),
    left: String(currentMargins.left),
  });

  function setMargin(side, val) {
    setMargins(m => ({ ...m, [side]: val }));
  }

  function resetMargins() {
    const wNum = parseInt(w, 10) || 0;
    const hNum = parseInt(h, 10) || 0;
    const exact = PRESETS.find(p => p.width === wNum && p.height === hNum);
    const closest = exact ?? PRESETS.reduce((best, p) => {
      const dBest = Math.abs(p.width - wNum) + Math.abs(p.height - hNum);
      const dCurr = Math.abs(best.width - wNum) + Math.abs(best.height - hNum);
      return dBest < dCurr ? p : best;
    });
    const m = closest.margins;
    setMargins({ top: String(m.top), right: String(m.right), bottom: String(m.bottom), left: String(m.left) });
  }

  function parseMargin(val, fallback) {
    const n = parseInt(val, 10);
    return isNaN(n) || n < 0 ? fallback : n;
  }

  function apply() {
    const width = Math.max(10, parseInt(w) || current.width);
    const height = Math.max(10, parseInt(h) || current.height);
    const newMargins = {
      top: parseMargin(margins.top, 20),
      right: parseMargin(margins.right, 20),
      bottom: parseMargin(margins.bottom, 20),
      left: parseMargin(margins.left, 20),
    };

    const sizeChanged = width !== current.width || height !== current.height;
    const hasContent = elements.length > 0 || !!backgroundImage.src;

    if (sizeChanged && hasContent) {
      setResizeConfirm({ newSize: { width, height }, newMargins });
      return;
    }

    // Size changed but no content — just apply without clearing
    // Size unchanged — only update margins (and canvasSize in case min was applied)
    if (sizeChanged) {
      dispatch(setCanvasSizeAndClear({ width, height }));
    } else {
      dispatch(setCanvasSize({ width, height }));
    }
    dispatch(setSafeAreaMargins(newMargins));
    onClose();
  }

  return (
    <>
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>Розмір банера</span>
          <button className="btn btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="preset-grid">
            {PRESETS.map(p => (
              <button
                key={p.label}
                className="btn btn-ghost preset-btn"
                onClick={() => {
                  setW(String(p.width));
                  setH(String(p.height));
                  if (p.margins) setMargins({ top: String(p.margins.top), right: String(p.margins.right), bottom: String(p.margins.bottom), left: String(p.margins.left) });
                }}
              >
                <span className="preset-label">{p.label}</span>
                <span className="preset-size">{p.width}×{p.height}</span>
              </button>
            ))}
          </div>
          <div className="size-inputs">
            <label>
              Ширина (px)
              <input type="number" min="10" max="4000" value={w} onChange={e => setW(e.target.value)} />
            </label>
            <span className="size-sep">×</span>
            <label>
              Висота (px)
              <input type="number" min="10" max="4000" value={h} onChange={e => setH(e.target.value)} />
            </label>
          </div>

          <div className="safe-margins-section">
            <div className="safe-margins-header">
              <div className="safe-margins-title">Відступи безпечної зони (px)</div>
              <button className="btn btn-sm" onClick={resetMargins}>За замовчуванням</button>
            </div>
            <div className="safe-margins-grid">
              <div className="safe-margins-top">
                <label className="safe-margin-label">Зверху</label>
                <input
                  type="number" min="0" className="text-input safe-margin-input"
                  value={margins.top} onChange={e => setMargin('top', e.target.value)}
                />
              </div>
              <div className="safe-margins-middle">
                <div className="safe-margin-side">
                  <label className="safe-margin-label">Зліва</label>
                  <input
                    type="number" min="0" className="text-input safe-margin-input"
                    value={margins.left} onChange={e => setMargin('left', e.target.value)}
                  />
                </div>
                <div className="safe-margin-preview">
                  <div className="safe-margin-rect" />
                </div>
                <div className="safe-margin-side">
                  <label className="safe-margin-label">Зправа</label>
                  <input
                    type="number" min="0" className="text-input safe-margin-input"
                    value={margins.right} onChange={e => setMargin('right', e.target.value)}
                  />
                </div>
              </div>
              <div className="safe-margins-bottom">
                <label className="safe-margin-label">Знизу</label>
                <input
                  type="number" min="0" className="text-input safe-margin-input"
                  value={margins.bottom} onChange={e => setMargin('bottom', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Скасувати</button>
          <button className="btn btn-primary" onClick={apply}>Застосувати</button>
        </div>
      </div>
    </div>
    {resizeConfirm && (
      <ResizeConfirmModal
        newSize={resizeConfirm.newSize}
        newMargins={resizeConfirm.newMargins}
        onClose={onClose}
      />
    )}
    </>
  );
}
