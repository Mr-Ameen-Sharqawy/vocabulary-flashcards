import { describe, expect, it } from 'vitest';
import { mergeCourseProgressForGrade, progressColumns, readStudentProgress } from './studentProgress';

describe('student progress by grade', () => {
  it('preserves existing Grade 4 progress while saving Grade 5 and Grade 6 progress', () => {
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
      grade6: {
        selectedLessonId: 'grade6-unit-1-lesson-1',
        lessonAnswers: { 'grade6-unit-1-lesson-1': { 'g6-1-1-1': 'buy souvenirs' } },
        quizScores: { '1': 3 },
      },
    };
    const restored = readStudentProgress(progressColumns(combined));

    expect(restored.grade4.lessonAnswers['unit-1-lesson-1']['1-1-1']).toBe('taste');
    expect(restored.grade4.quizScores['1']).toBe(4);
    expect(restored.grade5.lessonAnswers['grade5-unit-1-lesson-1']['g5-1-1-1']).toBe('water weeds');
    expect(restored.grade5.quizScores['1']).toBe(5);
    expect(restored.grade6.lessonAnswers['grade6-unit-1-lesson-1']['g6-1-1-1']).toBe('buy souvenirs');
    expect(restored.grade6.quizScores['1']).toBe(3);
  });

  it('does not overwrite a blocked grade with an empty client payload', () => {
    const existing = {
      grade4: { selectedLessonId: 'unit-1-lesson-1', lessonAnswers: { 'unit-1-lesson-1': { '1-1-1': 'taste' } }, quizScores: { '1': 4 } },
      grade5: { selectedLessonId: 'grade5-unit-1-lesson-1', lessonAnswers: { 'grade5-unit-1-lesson-1': { 'g5-1-1-1': 'water weeds' } }, quizScores: { '1': 5 } },
      grade6: { selectedLessonId: 'grade6-unit-1-lesson-1', lessonAnswers: { 'grade6-unit-1-lesson-1': { 'g6-1-1-1': 'buy souvenirs' } }, quizScores: { '1': 3 } },
    };
    const updated = mergeCourseProgressForGrade(existing, 'grade4', { selectedLessonId: 'unit-2-lesson-1', lessonAnswers: {}, quizScores: {} });

    expect(updated.grade4.selectedLessonId).toBe('unit-2-lesson-1');
    expect(updated.grade5.lessonAnswers['grade5-unit-1-lesson-1']['g5-1-1-1']).toBe('water weeds');
    expect(updated.grade6.lessonAnswers['grade6-unit-1-lesson-1']['g6-1-1-1']).toBe('buy souvenirs');
  });
});
