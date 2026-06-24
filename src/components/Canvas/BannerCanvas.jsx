import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Group } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectCanvasSize, selectBackground, selectBackgroundImage, selectElements,
  setSelectedId, updateBackgroundImage,
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
  const containerRef = useRef(null);
  const layerRef = useRef(null);
  const [scale, setScale] = useState(1);

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

      {/* Preview stage.
          Layout: Stage is (canvas + OVERFLOW*2) in canvas-units wide/tall.
          Banner content lives in an outer Group offset by OVERFLOW so that
          element coordinates stay in banner-space (0,0 = banner top-left).
          A clip Group inside restricts the VISUAL rendering to the banner rect,
          preventing backgrounds/images from spilling outside the white area.
          The Transformer is placed OUTSIDE the clip Group so its handles
          render at the element's true bounds — visible in the overflow zone. */}
      <Stage
        width={previewW}
        height={previewH}
        scaleX={scale}
        scaleY={scale}
        style={{ flexShrink: 0 }}
        onMouseDown={e => { if (e.target === e.target.getStage()) dispatch(setSelectedId(null)); }}
        onTap={e => { if (e.target === e.target.getStage()) dispatch(setSelectedId(null)); }}
      >
        <Layer ref={layerRef}>
          <Group x={OVERFLOW} y={OVERFLOW}>
            {/* Banner shadow + solid background.
                onMouseDown here handles deselection when clicking on empty canvas area. */}
            <Rect
              width={canvasSize.width}
              height={canvasSize.height}
              fill={background.color}
              shadowColor="rgba(0,0,0,0.35)"
              shadowBlur={22}
              shadowOffsetY={4}
              onMouseDown={() => dispatch(setSelectedId(null))}
            />
            {/* Content clipped to banner bounds — nothing spills outside */}
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

          {/* Transformer outside all clip groups — handles visible in overflow zone */}
          <CanvasTransformer layerRef={layerRef} />
        </Layer>
      </Stage>
    </div>
  );
}
