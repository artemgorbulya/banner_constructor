'use client';

import { useRef, useEffect } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './store';
import { selectElements, selectBackgroundImage, selectSelectedElement, migrateImageSrcs, bumpRegistryVersion } from './store/editorSlice';
import { initImageRegistry, storeImage } from './lib/imageRegistry';
import { useKeyboard } from './hooks/useKeyboard';
import { useLocalStorageSave } from './hooks/useLocalStorage';
import Toolbar from './components/Toolbar/Toolbar';
import BannerCanvas from './components/Canvas/BannerCanvas';
import LayersPanel from './components/panels/LayersPanel';
import AddPanel from './components/panels/AddPanel';
import TextControls from './components/panels/TextControls';
import ElementSizeControls from './components/panels/ElementSizeControls';

function EditorInner() {
  const dispatch = useDispatch();
  const stageRef = useRef(null);
  const textControlsRef = useRef(null);
  const selectedElement = useSelector(selectSelectedElement);
  const elements = useSelector(selectElements);
  const backgroundImage = useSelector(selectBackgroundImage);
  const { quotaExceeded } = useLocalStorageSave();
  useKeyboard();

  // On mount: load image registry from IDB, then migrate any raw base64 srcs in Redux state to IDs
  useEffect(() => {
    initImageRegistry().then(() => {
      const newElements = elements.map(el => {
        if (el.type === 'image' && el.src) {
          const id = storeImage(el.src);
          return id !== el.src ? { ...el, src: id } : el;
        }
        return el;
      });
      const newBgSrc = backgroundImage?.src ? storeImage(backgroundImage.src) : backgroundImage?.src;
      const changed = newElements.some((el, i) => el.src !== elements[i]?.src)
        || newBgSrc !== backgroundImage?.src;
      if (changed) {
        const newBg = newBgSrc !== backgroundImage?.src
          ? { ...backgroundImage, src: newBgSrc }
          : backgroundImage;
        dispatch(migrateImageSrcs({ elements: newElements, backgroundImage: newBg }));
      }
      // Always bump after IDB loads so ImageNode/BgImageNode re-resolve img_<uuid> IDs
      dispatch(bumpRegistryVersion());
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount only

  useEffect(() => {
    if (selectedElement?.type === 'text' && textControlsRef.current) {
      textControlsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedElement?.id, selectedElement?.type]);

  return (
    <div className="app">
      <Toolbar stageRef={stageRef} />
      {quotaExceeded && (
        <div className="autosave-warning">
          ⚠️ Проект завеликий для автозбереження — збережіть вручну через «Проекти»
        </div>
      )}
      <div className="editor-body">
        <LayersPanel />
        <BannerCanvas stageRef={stageRef} />
        <div className="right-panel">
          <AddPanel />
          <ElementSizeControls />
          <div ref={textControlsRef}>
            <TextControls />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <EditorInner />
    </Provider>
  );
}
