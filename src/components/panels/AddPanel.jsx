import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addElement, setBackground, clearBackgroundImage, selectBackground, selectBackgroundImage, selectCanvasSize } from '../../store/editorSlice';
import ImageModal from '../modals/ImageModal';
import { ChromePicker } from 'react-color';
import { Type, Image, Wallpaper, X } from 'lucide-react';

export default function AddPanel() {
  const dispatch = useDispatch();
  const canvasSize = useSelector(selectCanvasSize);
  const background = useSelector(selectBackground);
  const backgroundImage = useSelector(selectBackgroundImage);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showBgModal, setShowBgModal] = useState(false);
  const [showBgColor, setShowBgColor] = useState(false);

  function addText() {
    dispatch(addElement({
      type: 'text',
      text: 'Текст для банеру...',
      x: 40, y: 40,
      width: Math.min(400, canvasSize.width - 80),
      fontSize: 36,
      fontFamily: 'Rozetkaweb Regular',
      fontStyle: 'normal',
      textDecoration: '',
      align: 'left',
      lineHeight: 1.2,
      fill: '#1a1a1a',
      shadowEnabled: false,
      shadowColor: '#000000',
      shadowBlur: 4,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      name: 'Текст',
    }));
  }

  return (
    <aside className="side-panel">
      <div className="panel-section">
        <div className="panel-title">Додати</div>
        <button className="add-btn" onClick={addText}>
          <span className="add-btn-icon"><Type size={18} /></span>
          Текст
        </button>
        <button className="add-btn" onClick={() => setShowImageModal(true)}>
          <span className="add-btn-icon"><Image size={18} /></span>
          Зображення / Логотип
        </button>
      </div>

      <div className="panel-section">
        <div className="panel-title">Фон</div>
        <div className="bg-row">
          {/* Колір */}
          <button
            className={`bg-btn ${showBgColor ? 'bg-btn-active' : ''}`}
            title="Колір фону"
            onClick={() => { setShowBgColor(v => !v); }}
          >
            <span className="bg-swatch" style={{ background: background.color }} />
            <span>Колір</span>
          </button>
          {/* Зображення */}
          <button
            className={`bg-btn ${backgroundImage.src ? 'bg-btn-has-img' : ''}`}
            title="Фон зображенням"
            onClick={() => setShowBgModal(true)}
          >
            {backgroundImage.src
              ? <img src={backgroundImage.src} className="bg-thumb" alt="фон" />
              : <span className="add-btn-icon"><Wallpaper size={18} /></span>
            }
            <span>Зображення</span>
          </button>
          {backgroundImage.src && (
            <button
              className="btn btn-icon-sm btn-danger"
              title="Прибрати фон"
              onClick={() => dispatch(clearBackgroundImage())}
              style={{ alignSelf: 'center' }}
            ><X size={14} /></button>
          )}
        </div>
        {showBgColor && (
          <div className="color-picker-wrap" style={{ marginTop: 8 }}>
            <ChromePicker
              color={background.color}
              onChange={c => dispatch(setBackground({ color: c.hex }))}
              disableAlpha
            />
          </div>
        )}
      </div>

      {showImageModal && <ImageModal mode="element" onClose={() => setShowImageModal(false)} />}
      {showBgModal && <ImageModal mode="background" onClose={() => setShowBgModal(false)} />}
    </aside>
  );
}
