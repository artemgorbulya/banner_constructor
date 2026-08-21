import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  loadProject,
  selectCanvasSize, selectBackground, selectBackgroundImage,
  selectElements, selectSafeAreaMargins, selectDeviceFramesLayout,
} from '../../store/editorSlice';
import {
  loadProjects, saveNewProject, deleteProject,
  generateThumbnail, syncAutoSave,
  formatProjectDate, exportProjectToFile, importProjectFromFile,
  MAX_PROJECTS,
} from '../../lib/projects';
import { resolveStateImages, storeStateImages } from '../../lib/imageRegistry';
import { X, FolderOpen, Save, Trash2, ArrowLeft, AlertTriangle, Upload, FileDown } from 'lucide-react';

export default function ProjectsModal({ stageRef, initialView = 'list', onAfterSave, onClose }) {
  const dispatch = useDispatch();
  const canvasSize = useSelector(selectCanvasSize);
  const background = useSelector(selectBackground);
  const backgroundImage = useSelector(selectBackgroundImage);
  const elements = useSelector(selectElements);
  const safeAreaMargins = useSelector(selectSafeAreaMargins);
  const deviceFramesLayout = useSelector(selectDeviceFramesLayout);

  const currentState = { canvasSize, background, backgroundImage, elements, safeAreaMargins, deviceFramesLayout };

  const [view, setView] = useState(initialView);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [thumbnail, setThumbnail] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [importError, setImportError] = useState(null);
  const importRef = useRef(null);

  useEffect(() => {
    loadProjects().then(list => { setProjects(list); setLoading(false); });
    if (initialView === 'save') enterSaveView();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enterSaveView() {
    setThumbnail(generateThumbnail(stageRef));
    setName('');
    setSaveError(null);
    setView('save');
  }

  async function backToList() {
    const list = await loadProjects();
    setProjects(list);
    setView('list');
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const { projects: updated } = await saveNewProject(name, currentState, thumbnail);
      setProjects(updated);
      if (onAfterSave) {
        onAfterSave();
      } else {
        setView('list');
      }
    } catch (e) {
      if (e.message === 'LIMIT_REACHED') {
        setSaveError(`Досягнуто ліміт у ${MAX_PROJECTS} проектів. Видаліть деякі перед збереженням.`);
      } else {
        setSaveError('Помилка збереження: ' + (e.message ?? 'невідома'));
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleLoad(project) {
    dispatch(loadProject(project.state));
    syncAutoSave(project.state);
    onClose();
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    try {
      const updated = await deleteProject(id);
      setProjects(updated);
    } catch {
      // IDB error — list stays as-is; user can retry
    }
  }

  function handleExportJson(project, e) {
    e.stopPropagation();
    // Resolve any registry IDs back to actual base64 so the exported file is self-contained
    exportProjectToFile(project.name, resolveStateImages(project.state));
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const { state: rawState } = await importProjectFromFile(file);
      // Register any raw base64 images from the imported file and replace with IDs
      const state = storeStateImages(rawState);
      dispatch(loadProject(state));
      syncAutoSave(state);
      onClose();
    } catch (err) {
      setImportError(err.message);
    } finally {
      e.target.value = '';
    }
  }

  if (view === 'save') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-icon btn-ghost" onClick={backToList} title="Назад">
                <ArrowLeft size={16} />
              </button>
              <span>Зберегти проект</span>
            </div>
            <button className="btn btn-icon" onClick={onClose}><X size={16} /></button>
          </div>
          <div className="modal-body">
            <div className="project-save-thumb-wrap">
              {thumbnail
                ? <img src={thumbnail} alt="Прев'ю" className="project-save-thumb" />
                : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Прев'ю недоступне</span>
              }
            </div>
            <div className="form-row" style={{ marginTop: 12 }}>
              <label className="form-label">Назва проекту</label>
              <input
                type="text"
                className="text-input"
                placeholder="Без назви"
                value={name}
                maxLength={80}
                autoFocus
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isSaving && handleSave()}
              />
            </div>
            {saveError && (
              <div className="projects-warning">
                <AlertTriangle size={14} />
                {saveError}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={backToList}>Назад</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Збереження…' : 'Зберегти'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span><FolderOpen size={16} style={{ marginRight: 6, verticalAlign: -2 }} />Проекти</span>
          <button className="btn btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="projects-actions-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => importRef.current?.click()}>
                <Upload size={14} /> Імпорт .json
              </button>
              <input
                ref={importRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImport}
              />
              {importError && (
                <span className="projects-import-error"><AlertTriangle size={12} /> {importError}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="projects-storage-info">{projects.length} / {MAX_PROJECTS}</span>
              <button
                className="btn btn-primary"
                disabled={projects.length >= MAX_PROJECTS}
                onClick={enterSaveView}
                title={projects.length >= MAX_PROJECTS ? `Ліміт ${MAX_PROJECTS} проектів досягнуто` : ''}
              >
                <Save size={14} /> Зберегти поточний
              </button>
            </div>
          </div>

          {loading && (
            <div className="projects-empty">
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Завантаження…</div>
            </div>
          )}

          {!loading && projects.length === 0 && (
            <div className="projects-empty">
              <FolderOpen size={40} strokeWidth={1} />
              <div className="projects-empty-title">Немає збережених проектів</div>
              <div className="projects-empty-desc">
                Натисніть «Зберегти поточний», щоб зберегти банер з іменем та прев'ю. Або імпортуйте .json файл проекту.
              </div>
            </div>
          )}

          {!loading && projects.length > 0 && (
            <div className="projects-grid">
              {projects.map(p => (
                <div key={p.id} className="project-card" onClick={() => handleLoad(p)}>
                  <div className="project-thumb-wrap">
                    {p.thumbnail
                      ? <img src={p.thumbnail} alt={p.name} className="project-thumb" />
                      : <div className="project-thumb-placeholder">Без прев'ю</div>
                    }
                    <div className="project-load-overlay">
                      <span className="project-load-text">Завантажити</span>
                    </div>
                  </div>
                  <div className="project-info">
                    <div className="project-name" title={p.name}>{p.name}</div>
                    {p.state?.canvasSize && (
                      <div className="project-size">{p.state.canvasSize.width}×{p.state.canvasSize.height}</div>
                    )}
                    <div className="project-date">{formatProjectDate(p.savedAt)}</div>
                  </div>
                  <button
                    className="project-export-btn"
                    title="Зберегти як .json"
                    onClick={e => handleExportJson(p, e)}
                  >
                    <FileDown size={12} />
                  </button>
                  <button
                    className="project-delete-btn"
                    title="Видалити проект"
                    onClick={e => handleDelete(p.id, e)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Закрити</button>
        </div>
      </div>
    </div>
  );
}
