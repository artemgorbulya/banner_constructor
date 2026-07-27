import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectSelectedId, selectSelectedElement, selectSelectedElementType,
  selectBackgroundImage, selectKeepRatio,
  updateElementWithHistory, updateBackgroundImage,
} from '../../store/editorSlice';

const BG_ID = '__bg_image__';

export default function ElementSizeControls() {
  const dispatch = useDispatch();
  const selectedId = useSelector(selectSelectedId);
  const selectedElement = useSelector(selectSelectedElement);
  const selectedType = useSelector(selectSelectedElementType);
  const backgroundImage = useSelector(selectBackgroundImage);
  const keepRatio = useSelector(selectKeepRatio);

  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [ratio, setRatio] = useState(1);

  useEffect(() => {
    if (!selectedId) { setW(''); setH(''); return; }

    let rw, rh;
    if (selectedId === BG_ID) {
      rw = Math.round(backgroundImage.width ?? 0);
      rh = Math.round(backgroundImage.height ?? 0);
    } else if (selectedElement) {
      rw = Math.round(selectedElement.width ?? 0);
      rh = Math.round(selectedElement.height ?? 0);
    } else {
      return;
    }

    setW(String(rw));
    setH(String(rh));
    if (rh > 0) setRatio(rw / rh);
  }, [selectedId, selectedElement, backgroundImage]);

  if (!selectedId) return null;

  const isText = selectedType === 'text';

  function handleWChange(val) {
    setW(val);
    if (keepRatio && ratio > 0 && val !== '') {
      const n = parseFloat(val);
      if (!isNaN(n) && n > 0) setH(String(Math.round(n / ratio)));
    }
  }

  function handleHChange(val) {
    setH(val);
    if (keepRatio && ratio > 0 && val !== '') {
      const n = parseFloat(val);
      if (!isNaN(n) && n > 0) setW(String(Math.round(n * ratio)));
    }
  }

  function handleApply() {
    const newW = Math.max(10, parseInt(w, 10) || 10);
    const newH = Math.max(10, parseInt(h, 10) || 10);

    if (selectedId === BG_ID) {
      dispatch(updateBackgroundImage({ width: newW, height: newH }));
    } else {
      const update = { id: selectedId, width: newW };
      if (!isText) update.height = newH;
      dispatch(updateElementWithHistory(update));
    }
  }

  return (
    <div className="panel-section">
      <div className="panel-title">Розмір елементу</div>
      <div className="el-size-row">
        <div className="el-size-field">
          <span className="el-size-label">W</span>
          <input
            type="number"
            min={10}
            className="text-input el-size-input"
            value={w}
            onChange={e => handleWChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleApply()}
          />
          <span className="el-size-unit">px</span>
        </div>
        <div className="el-size-field">
          <span className="el-size-label">H</span>
          <input
            type="number"
            min={10}
            className="text-input el-size-input"
            value={h}
            disabled={isText}
            onChange={e => handleHChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleApply()}
          />
          <span className="el-size-unit">px</span>
        </div>
      </div>
      {isText && (
        <p className="el-size-hint">Висота тексту визначається автоматично</p>
      )}
      <button className="btn btn-primary el-size-apply" onClick={handleApply}>
        Застосувати
      </button>
    </div>
  );
}
