import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectElements, selectSelectedId, selectBackgroundImage,
  setSelectedId, deleteElement, updateElement, reorderLayers, clearBackgroundImage,
} from '../../store/editorSlice';
import { Type, Image, Wallpaper, Eye, EyeOff, X, Lock } from 'lucide-react';

const BG_ID = '__bg_image__';

export default function LayersPanel() {
  const dispatch = useDispatch();
  const elements = useSelector(selectElements);
  const selectedId = useSelector(selectSelectedId);
  const backgroundImage = useSelector(selectBackgroundImage);
  const dragEl = useRef(null);

  const reversed = [...elements].reverse();

  function getOriginalIndex(reversedIndex) {
    return elements.length - 1 - reversedIndex;
  }

  function handleDragStart(e, revIdx) {
    dragEl.current = revIdx;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(e, revIdx) {
    e.preventDefault();
    if (dragEl.current === null || dragEl.current === revIdx) return;
    dispatch(reorderLayers({ fromIndex: getOriginalIndex(dragEl.current), toIndex: getOriginalIndex(revIdx) }));
    dragEl.current = null;
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  return (
    <aside className="layers-panel">
      <div className="panel-title">Шари</div>
      {reversed.length === 0 && !backgroundImage.src && <p className="empty-hint">Немає елементів</p>}
      <ul className="layers-list">
        {reversed.map((el, revIdx) => (
          <li
            key={el.id}
            className={`layer-item ${el.id === selectedId ? 'layer-selected' : ''}`}
            onClick={() => dispatch(setSelectedId(el.id))}
            draggable
            onDragStart={e => handleDragStart(e, revIdx)}
            onDrop={e => handleDrop(e, revIdx)}
            onDragOver={handleDragOver}
          >
            <span className="layer-icon">{el.type === 'text' ? <Type size={14} /> : <Image size={14} />}</span>
            <span className="layer-name">{el.name || el.type}</span>
            <div className="layer-actions">
              <button
                className="btn btn-icon-sm"
                title={el.visible ? 'Приховати' : 'Показати'}
                onClick={e => { e.stopPropagation(); dispatch(updateElement({ id: el.id, visible: !el.visible })); }}
              >
                {el.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                className="btn btn-icon-sm btn-danger"
                title="Видалити"
                onClick={e => { e.stopPropagation(); dispatch(deleteElement(el.id)); }}
              ><X size={14} /></button>
            </div>
          </li>
        ))}

        {backgroundImage.src && (
          <li
            className={`layer-item layer-bg-item ${selectedId === BG_ID ? 'layer-selected' : ''}`}
            onClick={() => dispatch(setSelectedId(BG_ID))}
            title="Фон — завжди знизу"
          >
            <span className="layer-icon"><Wallpaper size={14} /></span>
            <span className="layer-name">Фон (зображення)</span>
            <div className="layer-actions">
              <span className="layer-lock" title="Завжди знизу"><Lock size={14} /></span>
              <button
                className="btn btn-icon-sm btn-danger"
                title="Видалити фон"
                onClick={e => { e.stopPropagation(); dispatch(clearBackgroundImage()); }}
              ><X size={14} /></button>
            </div>
          </li>
        )}
      </ul>
    </aside>
  );
}
