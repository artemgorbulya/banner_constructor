import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  undoHistory, redoHistory, resetProject,
  selectCanUndo, selectCanRedo, selectSnapEnabled, toggleSnapGrid,
  selectKeepRatio, toggleKeepRatio,
  selectSafeAreaEnabled, toggleSafeArea,
} from '../../store/editorSlice';
import SizeModal from '../modals/SizeModal';
import ExportModal from '../modals/ExportModal';
import InfoModal from '../modals/InfoModal';
import ProjectsModal from '../modals/ProjectsModal';
import { Undo2, Redo2, Lock, Unlock, Grid3x3, Download, Info, Scan, FolderOpen, Save, Trash2, X } from 'lucide-react';

export default function Toolbar({ stageRef }) {
  const dispatch = useDispatch();
  const canUndo = useSelector(selectCanUndo);
  const canRedo = useSelector(selectCanRedo);
  const snapEnabled = useSelector(selectSnapEnabled);
  const keepRatio = useSelector(selectKeepRatio);
  const safeAreaEnabled = useSelector(selectSafeAreaEnabled);
  const [showSize, setShowSize] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [projectsInitialView, setProjectsInitialView] = useState('list');
  const [projectsAfterSave, setProjectsAfterSave] = useState(null);
  const [showNewConfirm, setShowNewConfirm] = useState(false);

  function doReset() {
    dispatch(resetProject());
    localStorage.removeItem('banner_project_v1');
    localStorage.removeItem('banner_project_v2');
  }

  function handleNew() {
    setShowNewConfirm(true);
  }

  function handleNewWithoutSave() {
    doReset();
    setShowNewConfirm(false);
  }

  function handleNewWithSave() {
    setShowNewConfirm(false);
    setProjectsInitialView('save');
    setProjectsAfterSave(() => () => {
      doReset();
      setShowProjects(false);
    });
    setShowProjects(true);
  }

  function handleOpenProjects() {
    setProjectsInitialView('list');
    setProjectsAfterSave(null);
    setShowProjects(true);
  }

  function handleSaveAsProject() {
    setShowExport(false);
    setProjectsInitialView('save');
    setProjectsAfterSave(null);
    setShowProjects(true);
  }

  return (
    <>
      <header className="toolbar">
        <div className="toolbar-brand">
          <img src="/logo.png" alt="RozBanCon" className="toolbar-logo" />
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-ghost" onClick={handleNew}>Новий</button>
          <button className="btn btn-ghost" onClick={handleOpenProjects}>
            <FolderOpen size={14} /> Проекти
          </button>
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
          <button
            className={`btn btn-ghost ${safeAreaEnabled ? 'btn-active' : ''}`}
            title="Безпечна область (20px від країв)"
            onClick={() => dispatch(toggleSafeArea())}
          >
            <Scan size={14} /> Безпечна область
          </button>
          <div className="toolbar-divider" />
          <button className="btn btn-primary" onClick={() => setShowExport(true)}><Download size={14} /> Експорт</button>
        </div>
        <button className="btn btn-icon btn-ghost toolbar-info-btn" title="Довідка" onClick={() => setShowInfo(true)}><Info size={18} /></button>
      </header>

      {showNewConfirm && (
        <div className="modal-overlay" onClick={() => setShowNewConfirm(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>Новий проект</span>
              <button className="btn btn-icon" onClick={() => setShowNewConfirm(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
                Поточний проект буде замінено. Зберегти його перед створенням нового?
              </p>
              <div className="resize-confirm-options">
                <button className="resize-confirm-option" onClick={handleNewWithSave}>
                  <span className="resize-confirm-icon"><Save size={20} /></span>
                  <div className="resize-confirm-info">
                    <span className="resize-confirm-label">Зберегти і створити новий</span>
                    <span className="resize-confirm-desc">Збережіть поточний стан, потім відкриється чисте полотно</span>
                  </div>
                </button>
                <button className="resize-confirm-option resize-confirm-option--danger" onClick={handleNewWithoutSave}>
                  <span className="resize-confirm-icon"><Trash2 size={20} /></span>
                  <div className="resize-confirm-info">
                    <span className="resize-confirm-label">Скинути без збереження</span>
                    <span className="resize-confirm-desc">Поточний стан буде назавжди втрачено</span>
                  </div>
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowNewConfirm(false)}>Скасувати</button>
            </div>
          </div>
        </div>
      )}

      {showSize && <SizeModal onClose={() => setShowSize(false)} />}
      {showExport && (
        <ExportModal
          stageRef={stageRef}
          onClose={() => setShowExport(false)}
          onSaveAsProject={handleSaveAsProject}
        />
      )}
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
      {showProjects && (
        <ProjectsModal
          stageRef={stageRef}
          initialView={projectsInitialView}
          onAfterSave={projectsAfterSave ?? undefined}
          onClose={() => { setShowProjects(false); setProjectsAfterSave(null); }}
        />
      )}
    </>
  );
}
