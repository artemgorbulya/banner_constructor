import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChromePicker } from 'react-color';
import { pushHistory, updateElement, updateElementWithHistory, selectSelectedElement } from '../../store/editorSlice';

export default function ColorBlockControls() {
  const dispatch = useDispatch();
  const el = useSelector(selectSelectedElement);
  const [showFillPicker, setShowFillPicker] = useState(false);

  // Track whether a history snapshot has been pushed for the current picker-drag session.
  // Reset whenever a different element is selected (el.id changes).
  const historyRef = useRef({ fill: false });
  useEffect(() => {
    historyRef.current = { fill: false };
  }, [el?.id]);

  if (!el || el.type !== 'colorBlock') return null;

  return (
    <div className="text-controls">
      <div className="panel-title">Кольоровий елемент</div>

      <label className="control-label">Колір заливки</label>
      <button
        className="color-swatch-btn"
        style={{ background: el.fill }}
        onClick={() => setShowFillPicker(v => !v)}
      />
      {showFillPicker && (
        <div className="color-picker-wrap">
          <ChromePicker
            color={el.fill}
            onChange={c => {
              if (!historyRef.current.fill) {
                dispatch(pushHistory());
                historyRef.current.fill = true;
              }
              dispatch(updateElement({ id: el.id, fill: c.hex }));
            }}
            onChangeComplete={c => {
              // After the user finishes picking, commit and allow next session to push history again
              historyRef.current.fill = false;
              dispatch(updateElementWithHistory({ id: el.id, fill: c.hex }));
            }}
            disableAlpha
          />
        </div>
      )}
    </div>
  );
}
