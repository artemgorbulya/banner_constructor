import { useDispatch } from 'react-redux';
import { setCanvasSizeAndClear, setCanvasSizeAndScale, setSafeAreaMargins } from '../../store/editorSlice';
import { X, Trash2, ArrowRightLeft } from 'lucide-react';

export default function ResizeConfirmModal({ newSize, newMargins, onClose }) {
  const dispatch = useDispatch();

  function handleClear() {
    dispatch(setCanvasSizeAndClear(newSize));
    dispatch(setSafeAreaMargins(newMargins));
    onClose();
  }

  function handleScale() {
    dispatch(setCanvasSizeAndScale(newSize));
    dispatch(setSafeAreaMargins(newMargins));
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>Зміна розміру банера</span>
          <button className="btn btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p className="resize-confirm-text">
            Банер містить елементи або фон. Що зробити з вмістом при зміні розміру?
          </p>
          <div className="resize-confirm-options">
            <button className="resize-confirm-option" onClick={handleScale}>
              <span className="resize-confirm-icon"><ArrowRightLeft size={20} /></span>
              <div className="resize-confirm-info">
                <span className="resize-confirm-label">Перенести елементи</span>
                <span className="resize-confirm-desc">Всі елементи та фон масштабуються пропорційно під новий розмір</span>
              </div>
            </button>
            <button className="resize-confirm-option resize-confirm-option--danger" onClick={handleClear}>
              <span className="resize-confirm-icon"><Trash2 size={20} /></span>
              <div className="resize-confirm-info">
                <span className="resize-confirm-label">Очистити банер</span>
                <span className="resize-confirm-desc">Всі елементи та фон буде видалено, банер буде порожнім</span>
              </div>
            </button>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Відміна</button>
        </div>
      </div>
    </div>
  );
}
