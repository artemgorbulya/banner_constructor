import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCanvasSize, selectBackground, selectBackgroundImage, selectElements } from '../store/editorSlice';

const KEY = 'banner_project_v2';

export function useLocalStorageSave() {
  const canvasSize = useSelector(selectCanvasSize);
  const background = useSelector(selectBackground);
  const backgroundImage = useSelector(selectBackgroundImage);
  const elements = useSelector(selectElements);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ canvasSize, background, backgroundImage, elements }));
    } catch {
      // storage quota exceeded — ignore
    }
  }, [canvasSize, background, backgroundImage, elements]);
}
