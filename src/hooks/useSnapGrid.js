import { useSelector } from 'react-redux';
import { selectSnapEnabled } from '../store/editorSlice';

const GRID = 10;

export function useSnapGrid() {
  const snapEnabled = useSelector(selectSnapEnabled);

  function snap(pos) {
    if (!snapEnabled) return pos;
    return {
      x: Math.round(pos.x / GRID) * GRID,
      y: Math.round(pos.y / GRID) * GRID,
    };
  }

  return snap;
}
