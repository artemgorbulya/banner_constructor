// Lightweight stand-in for react-color's ChromePicker: exposes buttons that fire
// onChange (live drag) and onChangeComplete (release) with a given hex.
export function ChromePicker({ onChange, onChangeComplete }) {
  return (
    <div data-testid="chrome-picker">
      <button onClick={() => onChange?.({ hex: '#ff0000' })}>drag-red</button>
      <button onClick={() => onChange?.({ hex: '#00ff00' })}>drag-green</button>
      <button onClick={() => onChangeComplete?.({ hex: '#00ff00' })}>release-green</button>
    </div>
  );
}
