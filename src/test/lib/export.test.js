import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportBanner } from '../../lib/export.js';
import { saveAs } from 'file-saver';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeMockStageRef(dataURL = 'data:image/png;base64,ABC') {
  return {
    current: {
      toDataURL: vi.fn().mockReturnValue(dataURL),
    },
  };
}

describe('exportBanner', () => {
  it('exports PNG with quality 1 and correct mimeType', () => {
    const stageRef = makeMockStageRef('data:image/png;base64,PNG');
    exportBanner(stageRef, 'png', 0.5);
    expect(stageRef.current.toDataURL).toHaveBeenCalledWith({
      mimeType: 'image/png',
      quality: 1,
      pixelRatio: 1,
    });
    expect(saveAs).toHaveBeenCalledWith('data:image/png;base64,PNG', 'banner.png');
  });

  it('exports JPG with provided quality', () => {
    const stageRef = makeMockStageRef('data:image/jpeg;base64,JPG');
    exportBanner(stageRef, 'jpg', 0.8);
    expect(stageRef.current.toDataURL).toHaveBeenCalledWith({
      mimeType: 'image/jpeg',
      quality: 0.8,
      pixelRatio: 1,
    });
    expect(saveAs).toHaveBeenCalledWith('data:image/jpeg;base64,JPG', 'banner.jpg');
  });

  it('does nothing when stageRef.current is null', () => {
    exportBanner({ current: null }, 'png', 1);
    expect(saveAs).not.toHaveBeenCalled();
  });

  it('does nothing when stageRef.current is undefined', () => {
    exportBanner({ current: undefined }, 'png', 1);
    expect(saveAs).not.toHaveBeenCalled();
  });
});
