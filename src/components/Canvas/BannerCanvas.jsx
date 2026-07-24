import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Group } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectCanvasSize, selectBackground, selectBackgroundImage, selectElements,
  selectSelectedId, setSelectedId, updateBackgroundImage,
} from '../../store/editorSlice';
import ElementNode from './ElementNode';
import CanvasTransformer from './CanvasTransformer';

const BG_ID = '__bg_image__';
// Extra canvas-space pixels around the banner so Transformer handles
// remain visible even when an element extends outside the banner
const OVERFLOW = 150;

function BgImageNode({ bgImage, interactive, dispatch }) {
  const [img, setImg] = useState(null);

  useEffect(() => {
    if (!bgImage.src) { setImg(null); return; }
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.src = bgImage.src;
    image.onload = () => setImg(image);
  }, [bgImage.src]);

  if (!bgImage.src) return null;

  const props = {
    id: BG_ID,
    image: img,
    x: bgImage.x,
    y: bgImage.y,
    width: bgImage.width,
    height: bgImage.height,
    rotation: bgImage.rotation,
  };

  if (!interactive) return <KonvaImage {...props} />;

  return (
    <KonvaImage
      {...props}
      draggable
      onMouseDown={e => { e.cancelBubble = true; dispatch(setSelectedId(BG_ID)); }}
      onTap={e => { e.cancelBubble = true; dispatch(setSelectedId(BG_ID)); }}
      onDragEnd={e => {
        dispatch(updateBackgroundImage({ x: Math.round(e.target.x()), y: Math.round(e.target.y()) }));
      }}
      onTransformEnd={e => {
        const node = e.target;
        dispatch(updateBackgroundImage({
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.max(10, Math.round(node.width() * node.scaleX())),
          height: Math.max(10, Math.round(node.height() * node.scaleY())),
          rotation: node.rotation(),
        }));
        node.scaleX(1);
        node.scaleY(1);
      }}
    />
  );
}

export default function BannerCanvas({ stageRef }) {
  const dispatch = useDispatch();
  const canvasSize = useSelector(selectCanvasSize);
  const background = useSelector(selectBackground);
  const backgroundImage = useSelector(selectBackgroundImage);
  const elements = useSelector(selectElements);
  const selectedId = useSelector(selectSelectedId);
  const containerRef = useRef(null);
  const layerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [sizeLabel, setSizeLabel] = useState(null); // {w, h, stageX, stageY}

  useEffect(() => {
    function resize() {
      if (!containerRef.current) return;
      const pad = 40;
      const cw = containerRef.current.clientWidth - pad * 2;
      const ch = containerRef.current.clientHeight - pad * 2;
      // Scale so the full stage (canvas + overflow on all sides) fits in container
      const totalW = canvasSize.width + OVERFLOW * 2;
      const totalH = canvasSize.height + OVERFLOW * 2;
      setScale(Math.min(1, cw / totalW, ch / totalH));
    }
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [canvasSize]);

  // Show size label when element is selected (idle)
  useEffect(() => {
    if (!selectedId) { setSizeLabel(null); return; }

    if (selectedId === BG_ID) {
      if (!backgroundImage.src) { setSizeLabel(null); return; }
      setSizeLabel({
        w: Math.round(backgroundImage.width),
        h: Math.round(backgroundImage.height),
        stageX: (backgroundImage.x + backgroundImage.width + OVERFLOW) * scale,
        stageY: (backgroundImage.y + OVERFLOW) * scale,
      });
      return;
    }

    const el = elements.find(e => e.id === selectedId);
    if (!el) { setSizeLabel(null); return; }
    setSizeLabel({
      w: Math.round(el.width),
      h: el.height ? Math.round(el.height) : null,
      stageX: (el.x + el.width + OVERFLOW) * scale,
      stageY: (el.y + OVERFLOW) * scale,
    });
  }, [selectedId, elements, backgroundImage, scale]);

  // Update size label live during transform
  function handleSizeChange(node) {
    const rect = node.getClientRect();
    const w = Math.round(node.width() * node.scaleX());
    const h = Math.round(node.height() * node.scaleY());
    setSizeLabel({
      w,
      h,
      stageX: (rect.x + rect.width) * scale,
      stageY: rect.y * scale,
    });
  }

  const previewW = Math.round((canvasSize.width + OVERFLOW * 2) * scale);
  const previewH = Math.round((canvasSize.height + OVERFLOW * 2) * scale);

  return (
    <div ref={containerRef} className="canvas-workspace">
      {/* Export stage — exact canvas size, hidden */}
      <Stage
        ref={stageRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ display: 'none', position: 'absolute' }}
      >
        <Layer>
          <Rect width={canvasSize.width} height={canvasSize.height} fill={background.color} />
          <BgImageNode bgImage={backgroundImage} interactive={false} dispatch={dispatch} />
          {elements.filter(e => e.visible).map(el => <ElementNode key={el.id} el={el} />)}
        </Layer>
      </Stage>

      {/* Preview stage wrapped in relative div so tooltip can be positioned over it */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Stage
          width={previewW}
          height={previewH}
          scaleX={scale}
          scaleY={scale}
          style={{ display: 'block' }}
          onMouseDown={e => { if (e.target === e.target.getStage()) dispatch(setSelectedId(null)); }}
          onTap={e => { if (e.target === e.target.getStage()) dispatch(setSelectedId(null)); }}
        >
          <Layer ref={layerRef}>
            <Group x={OVERFLOW} y={OVERFLOW}>
              <Rect
                width={canvasSize.width}
                height={canvasSize.height}
                fill={background.color}
                shadowColor="rgba(0,0,0,0.35)"
                shadowBlur={22}
                shadowOffsetY={4}
                onMouseDown={() => dispatch(setSelectedId(null))}
              />
              <Group
                clipX={0}
                clipY={0}
                clipWidth={canvasSize.width}
                clipHeight={canvasSize.height}
              >
                <BgImageNode bgImage={backgroundImage} interactive={true} dispatch={dispatch} />
                {elements.map(el => <ElementNode key={el.id} el={el} />)}
              </Group>
            </Group>

            <CanvasTransformer layerRef={layerRef} onSizeChange={handleSizeChange} />
          </Layer>
        </Stage>

        {sizeLabel && (
          <div
            className="size-tooltip"
            style={{ left: sizeLabel.stageX, top: sizeLabel.stageY }}
          >
            {sizeLabel.h != null ? `${sizeLabel.w} × ${sizeLabel.h}` : `${sizeLabel.w} px`}
          </div>
        )}
      </div>
    </div>
  );
}
