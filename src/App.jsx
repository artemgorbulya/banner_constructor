'use client';

import { useRef, useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { store } from './store';
import { selectSelectedElement } from './store/editorSlice';
import { useKeyboard } from './hooks/useKeyboard';
import { useLocalStorageSave } from './hooks/useLocalStorage';
import Toolbar from './components/Toolbar/Toolbar';
import BannerCanvas from './components/Canvas/BannerCanvas';
import LayersPanel from './components/panels/LayersPanel';
import AddPanel from './components/panels/AddPanel';
import TextControls from './components/panels/TextControls';
import ElementSizeControls from './components/panels/ElementSizeControls';

function EditorInner() {
  const stageRef = useRef(null);
  const textControlsRef = useRef(null);
  const selectedElement = useSelector(selectSelectedElement);
  useKeyboard();
  useLocalStorageSave();

  useEffect(() => {
    if (selectedElement?.type === 'text' && textControlsRef.current) {
      textControlsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedElement?.id, selectedElement?.type]);

  return (
    <div className="app">
      <Toolbar stageRef={stageRef} />
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
