import { useRef, useEffect, useState } from 'react';
import { Image as KonvaImage, Text as KonvaText } from 'react-konva';
import { useDispatch } from 'react-redux';
import { updateElement, updateElementWithHistory, setSelectedId } from '../../store/editorSlice';
import { useSnapGrid } from '../../hooks/useSnapGrid';

function ImageNode({ el, onSelect }) {
  const dispatch = useDispatch();
  const snap = useSnapGrid();
  const [img, setImg] = useState(null);
  const nodeRef = useRef(null);

  useEffect(() => {
    if (!el.src) return;
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.src = el.src;
    image.onload = () => {
      setImg(image);
      // After image loads the transformer handles may need a redraw
      // because the node's visual state changed after initial attachment.
      nodeRef.current?.getLayer()?.batchDraw();
    };
  }, [el.src]);

  return (
    <KonvaImage
      ref={nodeRef}
      id={el.id}
      image={img}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={el.rotation}
      opacity={el.opacity}
      visible={el.visible}
      draggable
      // onMouseDown fires reliably on first press regardless of async image loading state
      onMouseDown={onSelect}
      onTap={onSelect}
      onDragMove={e => {
        const snapped = snap({ x: e.target.x(), y: e.target.y() });
        e.target.x(snapped.x);
        e.target.y(snapped.y);
        dispatch(updateElement({ id: el.id, x: snapped.x, y: snapped.y }));
      }}
      onDragEnd={e => {
        const snapped = snap({ x: e.target.x(), y: e.target.y() });
        dispatch(updateElementWithHistory({ id: el.id, x: snapped.x, y: snapped.y }));
      }}
      onTransformEnd={e => {
        const node = e.target;
        dispatch(updateElementWithHistory({
          id: el.id,
          x: node.x(),
          y: node.y(),
          width: Math.max(10, node.width() * node.scaleX()),
          height: Math.max(10, node.height() * node.scaleY()),
          rotation: node.rotation(),
        }));
        node.scaleX(1);
        node.scaleY(1);
      }}
    />
  );
}

function TextNode({ el, onSelect }) {
  const dispatch = useDispatch();
  const snap = useSnapGrid();

  return (
    <KonvaText
      id={el.id}
      text={el.text}
      x={el.x}
      y={el.y}
      width={el.width}
      // No fixed height — Konva auto-sizes based on content + word-wrap
      wrap="word"
      align={el.align ?? 'left'}
      lineHeight={el.lineHeight ?? 1.2}
      fontSize={el.fontSize}
      fontFamily={el.fontFamily}
      fontStyle={el.fontStyle}
      textDecoration={el.textDecoration}
      fill={el.fill}
      shadowEnabled={el.shadowEnabled}
      shadowColor={el.shadowColor}
      shadowBlur={el.shadowBlur}
      shadowOffsetX={el.shadowOffsetX}
      shadowOffsetY={el.shadowOffsetY}
      rotation={el.rotation}
      opacity={el.opacity}
      visible={el.visible}
      draggable
      onMouseDown={onSelect}
      onTap={onSelect}
      onDragMove={e => {
        const snapped = snap({ x: e.target.x(), y: e.target.y() });
        e.target.x(snapped.x);
        e.target.y(snapped.y);
        dispatch(updateElement({ id: el.id, x: snapped.x, y: snapped.y }));
      }}
      onDragEnd={e => {
        const snapped = snap({ x: e.target.x(), y: e.target.y() });
        dispatch(updateElementWithHistory({ id: el.id, x: snapped.x, y: snapped.y }));
      }}
      onTransform={e => {
        // Prevent distortion: only let scaleX change the width, reset Y scale immediately
        const node = e.target;
        const newWidth = Math.max(30, node.width() * node.scaleX());
        node.setAttrs({ width: newWidth, scaleX: 1, scaleY: 1 });
      }}
      onTransformEnd={e => {
        const node = e.target;
        // scaleX/scaleY already reset in onTransform, just persist width & position
        dispatch(updateElementWithHistory({
          id: el.id,
          x: node.x(),
          y: node.y(),
          width: Math.max(30, node.width()),
          rotation: node.rotation(),
        }));
      }}
    />
  );
}

export default function ElementNode({ el }) {
  const dispatch = useDispatch();

  function handleSelect(e) {
    e.cancelBubble = true;
    dispatch(setSelectedId(el.id));
  }

  if (el.type === 'image') return <ImageNode el={el} onSelect={handleSelect} />;
  if (el.type === 'text') return <TextNode el={el} onSelect={handleSelect} />;
  return null;
}
