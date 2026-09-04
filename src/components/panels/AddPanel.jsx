import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addElement, setBackground, pushHistory, selectBackground, selectBackgroundImage, selectCanvasSize, selectRegistryVersion } from '../../store/editorSlice';
import { resolveImage } from '../../lib/imageRegistry';
import ImageModal from '../modals/ImageModal';
import AiGenerateModal from '../modals/AiGenerateModal';
import { ChromePicker } from 'react-color';
import { Type, Image, Wallpaper, Sparkles, Square } from 'lucide-react';

export default function AddPanel() {
  const dispatch = useDispatch();
  const canvasSize = useSelector(selectCanvasSize);
  const background = useSelector(selectBackground);
  const backgroundImage = useSelector(selectBackgroundImage);
  useSelector(selectRegistryVersion); // re-render when IDB registry becomes ready
  const [showImageModal, setShowImageModal] = useState(false);
  const [showBgModal, setShowBgModal] = useState(false);
  const [showBgColor, setShowBgColor] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const colorHistorySaved = useRef(false);

  function addText() {
    dispatch(addElement({
      type: 'text',
      text: 'Текст для банеру...',
      x: 40, y: 40,
      width: Math.min(400, canvasSize.width - 80),
      fontSize: 36,
      fontFamily: 'Rozetka306pro Regular',
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

  function addColorBlock() {
    const size = Math.round(canvasSize.height * 0.5);
    dispatch(addElement({
      type: 'colorBlock',
      fill: '#ffffff',
      x: Math.round((canvasSize.width - size) / 2),
      y: Math.round((canvasSize.height - size) / 2),
      width: size,
      height: size,
      name: 'Кольоровий блок',
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
        <button className="add-btn" onClick={addColorBlock}>
          <span className="add-btn-icon"><Square size={18} /></span>
          Кольоровий елемент
        </button>
      </div>

      <div className="panel-section">
        <div className="panel-title">Фон</div>
        <div className="bg-row">
          {/* Колір */}
          <button
            className={`bg-btn ${showBgColor ? 'bg-btn-active' : ''}`}
            title="Колір фону"
            onClick={() => { colorHistorySaved.current = false; setShowBgColor(v => !v); }}
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
              ? <img src={resolveImage(backgroundImage.src)} className="bg-thumb" alt="фон" />
              : <span className="add-btn-icon"><Wallpaper size={18} /></span>
            }
            <span>Зображення</span>
          </button>
          {/* AI генерація */}
          <button
            className="bg-btn"
            title="Згенерувати фон через AI"
            onClick={() => setShowAi(true)}
          >
            <span className="add-btn-icon"><Sparkles size={18} /></span>
            <span>AI Фон</span>
          </button>
        </div>
        {showBgColor && (
          <div className="color-picker-wrap" style={{ marginTop: 8 }}>
            <ChromePicker
              color={background.color}
              onChange={c => {
                if (!colorHistorySaved.current) {
                  dispatch(pushHistory());
                  colorHistorySaved.current = true;
                }
                dispatch(setBackground({ color: c.hex }));
              }}
              disableAlpha
            />
          </div>
        )}
      </div>

      {showImageModal && <ImageModal mode="element" onClose={() => setShowImageModal(false)} />}
      {showBgModal && <ImageModal mode="background" onClose={() => setShowBgModal(false)} />}
      {showAi && <AiGenerateModal onClose={() => setShowAi(false)} />}
    </aside>
  );
}
