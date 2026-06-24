import { useLayoutEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import { useSelector } from 'react-redux';
import { selectSelectedId, selectKeepRatio, selectSelectedElementType } from '../../store/editorSlice';

const ALL_ANCHORS = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

const TEXT_ANCHORS = ['middle-left', 'middle-right'];

export default function CanvasTransformer({ layerRef }) {
  const trRef = useRef(null);
  const selectedId = useSelector(selectSelectedId);
  const keepRatio = useSelector(selectKeepRatio);
  const selectedType = useSelector(selectSelectedElementType);

  // Refs so boundBoxFunc always reads the latest values without stale closure
  const keepRatioRef = useRef(keepRatio);
  const isTextRef = useRef(selectedType === 'text');
  keepRatioRef.current = keepRatio;
  isTextRef.current = selectedType === 'text';

  useLayoutEffect(() => {
    if (!trRef.current || !layerRef.current) return;
    const node = selectedId ? layerRef.current.findOne(`#${selectedId}`) : null;
    trRef.current.nodes(node ? [node] : []);
    trRef.current.getLayer()?.batchDraw();

    // In React 19 concurrent mode react-konva may defer adding the new Konva
    // node to the layer past the synchronous commit phase, so findOne returns
    // null on first add. Retry once on the next frame — by then the node is
    // guaranteed to be in the layer. Skip RAF if node was found immediately.
    if (selectedId && !node) {
      const raf = requestAnimationFrame(() => {
        if (!trRef.current || !layerRef.current) return;
        const n = layerRef.current.findOne(`#${selectedId}`);
        trRef.current.nodes(n ? [n] : []);
        trRef.current.getLayer()?.batchDraw();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [selectedId, layerRef]);

  const isText = selectedType === 'text';

  return (
    <Transformer
      ref={trRef}
      rotateEnabled={!isText}
      keepRatio={isText ? false : keepRatio}
      enabledAnchors={isText ? TEXT_ANCHORS : ALL_ANCHORS}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 10 || newBox.height < 10) return oldBox;

        // When keepRatio is ON and it's not a text element, enforce ratio for
        // ALL handles — including side handles that Konva's native keepRatio ignores.
        if (keepRatioRef.current && !isTextRef.current && oldBox.width && oldBox.height) {
          const ratio = oldBox.width / oldBox.height;
          const wDelta = Math.abs(newBox.width - oldBox.width);
          const hDelta = Math.abs(newBox.height - oldBox.height);

          if (wDelta >= hDelta) {
            // Width changed more — derive height from it
            return { ...newBox, height: newBox.width / ratio };
          } else {
            // Height changed more — derive width from it
            return { ...newBox, width: newBox.height * ratio };
          }
        }

        return newBox;
      }}
    />
  );
}
