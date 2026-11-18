import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer, { addElement, setSelectedId, toggleSnapGrid } from '../../../store/editorSlice';
import ElementNode from '../../../components/Canvas/ElementNode';

// Capture the props each Konva node receives so handlers can be invoked directly
const nodes = {};
vi.mock('react-konva', async () => {
  const { forwardRef } = await import('react');
  const make = kind => forwardRef(function KonvaStub(props) {
    nodes[kind] = props;
    return null;
  });
  return { Image: make('Image'), Text: make('Text'), Rect: make('Rect') };
});

// Minimal stand-in for a Konva node passed as e.target
function fakeNode(attrs) {
  const a = { scaleX: 1, scaleY: 1, rotation: 0, ...attrs };
  const accessor = k => v => (v === undefined ? a[k] : (a[k] = v));
  return {
    attrs: a,
    x: accessor('x'), y: accessor('y'),
    width: accessor('width'), height: accessor('height'),
    scaleX: accessor('scaleX'), scaleY: accessor('scaleY'),
    rotation: accessor('rotation'),
    setAttrs: obj => Object.assign(a, obj),
  };
}

function setup(element, { snap = true } = {}) {
  const store = configureStore({ reducer: { editor: editorReducer } });
  if (!snap) store.dispatch(toggleSnapGrid());
  store.dispatch(addElement(element));
  store.dispatch(setSelectedId(null));
  const el = () => store.getState().editor.elements[0];
  const past = () => store.getState().editor.history.past.length;
  render(<Provider store={store}><ElementNode el={el()} /></Provider>);
  return { store, el, past };
}

const image = { type: 'image', src: '/a.png', x: 10, y: 20, width: 100, height: 50 };
const text = { type: 'text', text: 'Hi', x: 0, y: 0, width: 200, fontSize: 30, fill: '#000' };
const block = { type: 'colorBlock', fill: '#ff0000', x: 0, y: 0, width: 80, height: 80 };

describe('ElementNode', () => {
  beforeEach(() => { Object.keys(nodes).forEach(k => delete nodes[k]); });

  it('renders the matching Konva node per element type', () => {
    setup(image);
    expect(nodes.Image).toMatchObject({ x: 10, y: 20, width: 100, height: 50, draggable: true });
    setup(text);
    expect(nodes.Text).toMatchObject({ text: 'Hi', width: 200, wrap: 'word', align: 'left', lineHeight: 1.2 });
    expect(nodes.Text.height).toBeUndefined(); // auto-height
    setup(block);
    expect(nodes.Rect).toMatchObject({ fill: '#ff0000', width: 80, height: 80 });
  });

  it('renders nothing for unknown types', () => {
    setup({ type: 'mystery', x: 0, y: 0 });
    expect(Object.keys(nodes)).toEqual([]);
  });

  it.each([['Image', image], ['Text', text], ['Rect', block]])('%s: mousedown and tap select the element and stop bubbling', (kind, element) => {
    const { store, el } = setup(element);
    const e = { cancelBubble: false };
    act(() => nodes[kind].onMouseDown(e));
    expect(e.cancelBubble).toBe(true);
    expect(store.getState().editor.selectedId).toBe(el().id);

    act(() => { store.dispatch(setSelectedId(null)); });
    act(() => nodes[kind].onTap({}));
    expect(store.getState().editor.selectedId).toBe(el().id);
  });

  it.each([['Image', image], ['Text', text], ['Rect', block]])('%s: drag snaps to 10px grid; live move has no history, drag end commits', (kind, element) => {
    const { el, past } = setup(element);
    const start = past();
    const node = fakeNode({ x: 33, y: 47 });

    act(() => nodes[kind].onDragMove({ target: node }));
    expect(node.attrs).toMatchObject({ x: 30, y: 50 }); // node itself is snapped
    expect(el()).toMatchObject({ x: 30, y: 50 });
    expect(past()).toBe(start);

    node.x(64); node.y(5);
    act(() => nodes[kind].onDragEnd({ target: node }));
    expect(el()).toMatchObject({ x: 60, y: 10 });
    expect(past()).toBe(start + 1);
  });

  it('drag without snap keeps exact coordinates', () => {
    const { el } = setup(block, { snap: false });
    act(() => nodes.Rect.onDragEnd({ target: fakeNode({ x: 33, y: 47 }) }));
    expect(el()).toMatchObject({ x: 33, y: 47 });
  });

  it.each([['Image', image], ['Rect', block]])('%s: transform end bakes scale into size, enforces 10px minimum and resets scale', (kind, element) => {
    const { el, past } = setup(element);
    const start = past();
    const node = fakeNode({ x: 5, y: 6, width: 100, height: 50, scaleX: 2, scaleY: 3, rotation: 45 });
    act(() => nodes[kind].onTransformEnd({ target: node }));
    expect(el()).toMatchObject({ x: 5, y: 6, width: 200, height: 150, rotation: 45 });
    expect(node.attrs).toMatchObject({ scaleX: 1, scaleY: 1 });
    expect(past()).toBe(start + 1);

    act(() => nodes[kind].onTransformEnd({ target: fakeNode({ x: 0, y: 0, width: 100, height: 100, scaleX: 0.01, scaleY: 0.01 }) }));
    expect(el()).toMatchObject({ width: 10, height: 10 });
  });

  it('Text: transform only changes width (min 30) and never distorts', () => {
    const { el } = setup(text);
    const node = fakeNode({ x: 1, y: 2, width: 200, scaleX: 1.5, scaleY: 1.5 });
    act(() => nodes.Text.onTransform({ target: node }));
    expect(node.attrs).toMatchObject({ width: 300, scaleX: 1, scaleY: 1 });

    act(() => nodes.Text.onTransformEnd({ target: node }));
    expect(el()).toMatchObject({ x: 1, y: 2, width: 300 });
    expect(el().height).toBeUndefined();

    const tiny = fakeNode({ width: 200, scaleX: 0.01 });
    act(() => nodes.Text.onTransform({ target: tiny }));
    expect(tiny.attrs.width).toBe(30);
  });

  it('Image: loads the resolved src into a window.Image', () => {
    const created = [];
    const Orig = window.Image;
    window.Image = class { constructor() { created.push(this); } };
    try {
      setup(image);
      expect(created).toHaveLength(1);
      expect(created[0].src).toBe('/a.png');
      expect(created[0].crossOrigin).toBe('anonymous');
      act(() => created[0].onload());
      expect(nodes.Image.image).toBe(created[0]);
    } finally {
      window.Image = Orig;
    }
  });
});
