import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  undoHistory, redoHistory, resetProject,
  selectCanUndo, selectCanRedo, selectSnapEnabled, toggleSnapGrid,
  selectKeepRatio, toggleKeepRatio,
} from '../../store/editorSlice';
import SizeModal from '../modals/SizeModal';
import ExportModal from '../modals/ExportModal';
import InfoModal from '../modals/InfoModal';
import { Undo2, Redo2, Lock, Unlock, Grid3x3, Download, Info } from 'lucide-react';

export default function Toolbar({ stageRef }) {
  const dispatch = useDispatch();
  const canUndo = useSelector(selectCanUndo);
  const canRedo = useSelector(selectCanRedo);
  const snapEnabled = useSelector(selectSnapEnabled);
  const keepRatio = useSelector(selectKeepRatio);
  const [showSize, setShowSize] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  function handleNew() {
    if (confirm('Створити новий проект? Поточний буде втрачено.')) {
      dispatch(resetProject());
      localStorage.removeItem('banner_project_v1');
      localStorage.removeItem('banner_project_v2');
    }
  }

  return (
    <>
      <header className="toolbar">
        <div className="toolbar-brand">Banner Constructor</div>
        <div className="toolbar-actions">
          <button className="btn btn-ghost" onClick={handleNew}>Новий</button>
          <button className="btn btn-ghost" onClick={() => setShowSize(true)}>Розмір</button>
          <div className="toolbar-divider" />
          <button className="btn btn-icon" title="Скасувати (Ctrl+Z)" disabled={!canUndo} onClick={() => dispatch(undoHistory())}><Undo2 size={16} /></button>
          <button className="btn btn-icon" title="Повторити (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => dispatch(redoHistory())}><Redo2 size={16} /></button>
          <div className="toolbar-divider" />
          <button
            className={`btn btn-ghost ${snapEnabled ? 'btn-active' : ''}`}
            title="Прив'язка до сітки"
            onClick={() => dispatch(toggleSnapGrid())}
          >
            <Grid3x3 size={14} /> Сітка
          </button>
          <button
            className={`btn btn-ghost ${keepRatio ? 'btn-active' : ''}`}
            title={keepRatio ? 'Пропорції заблоковані — натисніть щоб розблокувати' : 'Пропорції вільні — натисніть щоб заблокувати'}
            onClick={() => dispatch(toggleKeepRatio())}
          >
            {keepRatio ? <Lock size={14} /> : <Unlock size={14} />} Пропорції
          </button>
          <div className="toolbar-divider" />
          <button className="btn btn-primary" onClick={() => setShowExport(true)}><Download size={14} /> Експорт</button>
        </div>
        <button className="btn btn-icon btn-ghost toolbar-info-btn" title="Довідка" onClick={() => setShowInfo(true)}><Info size={18} /></button>
      </header>
      {showSize && <SizeModal onClose={() => setShowSize(false)} />}
      {showExport && <ExportModal stageRef={stageRef} onClose={() => setShowExport(false)} />}
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
    </>
  );
}
