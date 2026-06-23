'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { useKeyboard } from './hooks/useKeyboard';
import { useLocalStorageSave } from './hooks/useLocalStorage';
import Toolbar from './components/Toolbar/Toolbar';
import BannerCanvas from './components/Canvas/BannerCanvas';
import LayersPanel from './components/panels/LayersPanel';
import AddPanel from './components/panels/AddPanel';
import TextControls from './components/panels/TextControls';

function EditorInner() {
  const stageRef = useRef(null);
  useKeyboard();
  useLocalStorageSave();

  return (
    <div className="app">
      <Toolbar stageRef={stageRef} />
      <div className="editor-body">
        <LayersPanel />
        <BannerCanvas stageRef={stageRef} />
        <div className="right-panel">
          <AddPanel />
          <TextControls />
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
