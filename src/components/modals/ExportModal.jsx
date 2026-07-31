import { useState, useEffect, useRef } from 'react';
import { exportBanner } from '../../lib/export';
import { X, AlertTriangle, Save } from 'lucide-react';

const SIZE_LIMIT_KB = 150;

function calcSizeKB(stageRef, format, quality) {
  const stage = stageRef.current;
  if (!stage) return null;
  const dataURL = stage.toDataURL({
    mimeType: format === 'jpg' ? 'image/jpeg' : 'image/png',
    quality: format === 'jpg' ? quality : 1,
    pixelRatio: 1,
  });
  const base64 = dataURL.split(',')[1] ?? '';
  const padding = (base64.slice(-2).match(/=/g) ?? []).length;
  return Math.round((base64.length * 0.75 - padding) / 1024);
}

export default function ExportModal({ stageRef, onClose, onSaveAsProject }) {
  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(0.9);
  const [fileSize, setFileSize] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setFileSize(null);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setFileSize(calcSizeKB(stageRef, format, quality));
    }, 150);
    return () => clearTimeout(timerRef.current);
  }, [format, quality, stageRef]);

  function handleExport() {
    exportBanner(stageRef, format, quality);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>Експорт банера</span>
          <button className="btn btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <label className="form-label">Формат</label>
            <div className="radio-group">
              <label><input type="radio" value="png" checked={format === 'png'} onChange={() => setFormat('png')} /> PNG (без втрат)</label>
              <label><input type="radio" value="jpg" checked={format === 'jpg'} onChange={() => setFormat('jpg')} /> JPG</label>
            </div>
          </div>
          {format === 'jpg' && (
            <div className="form-row">
              <label className="form-label">Якість: {Math.round(quality * 100)}%</label>
              <input
                type="range" min="10" max="100" value={Math.round(quality * 100)}
                onChange={e => setQuality(parseInt(e.target.value) / 100)}
                className="range-input"
              />
              <div className="range-labels"><span>Менше</span><span>Краще</span></div>
            </div>
          )}
          <div className="export-size-row">
            <span className="export-size-label">Розмір файлу:</span>
            <span className={`export-size-value ${fileSize !== null && fileSize > SIZE_LIMIT_KB ? 'export-size-over' : ''}`}>
              {fileSize === null ? '…' : `~${fileSize} КБ`}
            </span>
          </div>
          {fileSize !== null && fileSize > SIZE_LIMIT_KB && (
            <div className="export-size-warning">
              <AlertTriangle size={14} />
              Розмір файлу перевищує {SIZE_LIMIT_KB} КБ. Рекомендований максимум для банерів — {SIZE_LIMIT_KB} КБ. Спробуйте формат JPG або знизьте якість.
            </div>
          )}
          <div className="export-size-hint">
            Рекомендований максимальний розмір файлу: <strong>{SIZE_LIMIT_KB} КБ</strong>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Скасувати</button>
          {onSaveAsProject && (
            <button className="btn btn-ghost" onClick={onSaveAsProject}>
              <Save size={14} /> Зберегти як проект
            </button>
          )}
          <button className="btn btn-primary" onClick={handleExport}>Завантажити</button>
        </div>
      </div>
    </div>
  );
}
