import { describe, it, expect } from 'vitest';
import { parseSessionFile, SESSION_FORMAT, SESSION_LIBRARY_FORMAT } from './SessionPlanApp.jsx';

describe('parseSessionFile', () => {
  const session = { id: 's1', blocks: [] };
  const drill = { id: 'd1', frames: [] };

  it('czyta pojedynczy konspekt i bibliotekę konspektów', () => {
    expect(parseSessionFile({ format: SESSION_FORMAT, session, drills: [drill] })).toEqual({ sessions: [session], drills: [drill] });
    expect(parseSessionFile({ format: SESSION_LIBRARY_FORMAT, sessions: [session] })).toEqual({ sessions: [session], drills: [] });
  });

  it('czyta konspekty i ćwiczenia z pełnej kopii (Dane)', () => {
    const backup = { format: 'model-gry-backup', version: 1, sections: { sessions: [session], drills: [drill] } };
    expect(parseSessionFile(backup)).toEqual({ sessions: [session], drills: [drill] });
  });

  it('odrzuca kopię bez konspektów i nieznane pliki', () => {
    expect(parseSessionFile({ format: 'model-gry-backup', sections: { drills: [drill] } })).toBeNull();
    expect(parseSessionFile({ format: 'coś-innego' })).toBeNull();
    expect(parseSessionFile(null)).toBeNull();
  });
});
