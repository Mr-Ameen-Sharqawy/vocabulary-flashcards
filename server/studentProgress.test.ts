import { describe, expect, it } from 'vitest';
import { progressColumns, readStudentProgress } from './studentProgress';

describe('student progress by grade', () => {
  it('preserves existing Grade 4 progress while saving Grade 5 progress', () => {
    const existing = readStudentProgress({
      selectedLessonId: 'unit-1-lesson-1',
      lessonAnswers: { 'unit-1-lesson-1': { '1-1-1': 'taste' } },
      quizScores: { '1': 4 },
    });
    const combined = {
      ...existing,
      grade5: {
        selectedLessonId: 'grade5-unit-1-lesson-1',
        lessonAnswers: { 'grade5-unit-1-lesson-1': { 'g5-1-1-1': 'water weeds' } },
        quizScores: { '1': 5 },
      },
    };
    const restored = readStudentProgress(progressColumns(combined));

    expect(restored.grade4.lessonAnswers['unit-1-lesson-1']['1-1-1']).toBe('taste');
    expect(restored.grade4.quizScores['1']).toBe(4);
    expect(restored.grade5.lessonAnswers['grade5-unit-1-lesson-1']['g5-1-1-1']).toBe('water weeds');
    expect(restored.grade5.quizScores['1']).toBe(5);
  });
});
