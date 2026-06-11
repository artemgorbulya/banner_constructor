import { saveAs } from 'file-saver';

export function exportBanner(stageRef, format, quality) {
  const stage = stageRef.current;
  if (!stage) return;
  const dataURL = stage.toDataURL({
    mimeType: format === 'jpg' ? 'image/jpeg' : 'image/png',
    quality: format === 'jpg' ? quality : 1,
    pixelRatio: 1,
  });
  saveAs(dataURL, `banner.${format}`);
}
