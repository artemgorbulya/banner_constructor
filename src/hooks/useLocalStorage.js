import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCanvasSize, selectBackground, selectBackgroundImage, selectElements, selectSafeAreaMargins, selectDeviceFramesLayout } from '../store/editorSlice';

const KEY = 'banner_project_v2';
const DEBOUNCE_MS = 1000;

export function useLocalStorageSave() {
  const canvasSize = useSelector(selectCanvasSize);
  const background = useSelector(selectBackground);
  const backgroundImage = useSelector(selectBackgroundImage);
  const elements = useSelector(selectElements);
  const safeAreaMargins = useSelector(selectSafeAreaMargins);
  const deviceFramesLayout = useSelector(selectDeviceFramesLayout);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify({ canvasSize, background, backgroundImage, elements, safeAreaMargins, deviceFramesLayout }));
        setQuotaExceeded(false);
      } catch {
        setQuotaExceeded(true);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [canvasSize, background, backgroundImage, elements, safeAreaMargins, deviceFramesLayout]);

  return { quotaExceeded };
}
