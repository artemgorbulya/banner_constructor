import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCanvasSize, selectCanvasSize } from '../../store/editorSlice';
import { PRESETS } from '../../lib/presets';
import { X } from 'lucide-react';

export default function SizeModal({ onClose }) {
  const dispatch = useDispatch();
  const current = useSelector(selectCanvasSize);
  const [w, setW] = useState(String(current.width));
  const [h, setH] = useState(String(current.height));

  function apply() {
    const width = Math.max(10, parseInt(w) || current.width);
    const height = Math.max(10, parseInt(h) || current.height);
    dispatch(setCanvasSize({ width, height }));
    onClose();
  }

  return (
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
                onClick={() => { setW(String(p.width)); setH(String(p.height)); }}
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
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Скасувати</button>
          <button className="btn btn-primary" onClick={apply}>Застосувати</button>
        </div>
      </div>
    </div>
  );
}
