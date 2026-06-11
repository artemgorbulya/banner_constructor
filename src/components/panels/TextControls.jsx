import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChromePicker } from 'react-color';
import { updateElementWithHistory, selectSelectedElement } from '../../store/editorSlice';
import { LOCAL_FONTS, loadFont } from '../../lib/fonts';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

export default function TextControls() {
  const dispatch = useDispatch();
  const el = useSelector(selectSelectedElement);
  const [showFillPicker, setShowFillPicker] = useState(false);
  const [loadingFont, setLoadingFont] = useState(null);

  if (!el || el.type !== 'text') return null;

  function update(changes) {
    dispatch(updateElementWithHistory({ id: el.id, ...changes }));
  }

  function toggleBold() {
    const isBold = el.fontStyle?.includes('bold');
    const isItalic = el.fontStyle?.includes('italic');
    update({ fontStyle: [isBold ? '' : 'bold', isItalic ? 'italic' : ''].filter(Boolean).join(' ') || 'normal' });
  }

  function toggleItalic() {
    const isBold = el.fontStyle?.includes('bold');
    const isItalic = el.fontStyle?.includes('italic');
    update({ fontStyle: [isBold ? 'bold' : '', isItalic ? '' : 'italic'].filter(Boolean).join(' ') || 'normal' });
  }

  function toggleUnderline() {
    update({ textDecoration: el.textDecoration === 'underline' ? '' : 'underline' });
  }

  async function handleFont(family) {
    setLoadingFont(family);
    await loadFont(family);
    update({ fontFamily: family });
    setLoadingFont(null);
  }

  const isBold = el.fontStyle?.includes('bold');
  const isItalic = el.fontStyle?.includes('italic');
  const isUnderline = el.textDecoration === 'underline';

  return (
    <div className="text-controls">
      <div className="panel-title">Текст</div>

      <label className="control-label">Вміст</label>
      <textarea
        className="text-input text-area-small"
        value={el.text}
        onChange={e => update({ text: e.target.value })}
        rows={2}
      />

      <label className="control-label">
        Шрифт{loadingFont && <span className="font-loading-hint"> завантаження…</span>}
      </label>
      <select
        className="select-input"
        value={loadingFont ?? el.fontFamily}
        disabled={!!loadingFont}
        onChange={e => handleFont(e.target.value)}
      >
        {LOCAL_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
      </select>

      <label className="control-label">Розмір</label>
      <div className="size-row">
        <button className="btn btn-icon" onClick={() => update({ fontSize: Math.max(6, el.fontSize - 2) })}>−</button>
        <input
          type="number" className="text-input size-input" min="6" max="500"
          value={el.fontSize} onChange={e => update({ fontSize: parseInt(e.target.value) || el.fontSize })}
        />
        <button className="btn btn-icon" onClick={() => update({ fontSize: el.fontSize + 2 })}>+</button>
      </div>

      <label className="control-label">Міжрядковий інтервал: {(el.lineHeight ?? 1.2).toFixed(1)}</label>
      <input
        type="range" min="0.8" max="3" step="0.1"
        value={el.lineHeight ?? 1.2}
        onChange={e => update({ lineHeight: parseFloat(e.target.value) })}
        className="range-input"
      />
      <div className="range-labels"><span>Щільніше</span><span>Ширше</span></div>

      <label className="control-label">Стиль</label>
      <div className="format-btns">
        <button className={`btn btn-fmt ${isBold ? 'btn-active' : ''}`} onClick={toggleBold}><Bold size={15} /></button>
        <button className={`btn btn-fmt ${isItalic ? 'btn-active' : ''}`} onClick={toggleItalic}><Italic size={15} /></button>
        <button className={`btn btn-fmt ${isUnderline ? 'btn-active' : ''}`} onClick={toggleUnderline}><Underline size={15} /></button>
      </div>

      <label className="control-label">Вирівнювання</label>
      <div className="format-btns">
        <button
          className={`btn btn-fmt ${(!el.align || el.align === 'left') ? 'btn-active' : ''}`}
          title="По лівому краю"
          onClick={() => update({ align: 'left' })}
        ><AlignLeft size={15} /></button>
        <button
          className={`btn btn-fmt ${el.align === 'center' ? 'btn-active' : ''}`}
          title="По центру"
          onClick={() => update({ align: 'center' })}
        ><AlignCenter size={15} /></button>
        <button
          className={`btn btn-fmt ${el.align === 'right' ? 'btn-active' : ''}`}
          title="По правому краю"
          onClick={() => update({ align: 'right' })}
        ><AlignRight size={15} /></button>
      </div>

      <label className="control-label">Колір тексту</label>
      <button
        className="color-swatch-btn"
        style={{ background: el.fill }}
        onClick={() => setShowFillPicker(v => !v)}
      />
      {showFillPicker && (
        <div className="color-picker-wrap">
          <ChromePicker color={el.fill} onChange={c => update({ fill: c.hex })} disableAlpha />
        </div>
      )}

    </div>
  );
}
