import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { undoHistory, redoHistory, deleteElement, selectSelectedId } from '../store/editorSlice';

export function useKeyboard() {
  const dispatch = useDispatch();
  const selectedId = useSelector(selectSelectedId);

  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        dispatch(undoHistory());
      } else if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        e.preventDefault();
        dispatch(redoHistory());
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        dispatch(deleteElement(selectedId));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch, selectedId]);
}
