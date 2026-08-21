export type CourseProgress = {
  selectedLessonId?: string;
  lessonAnswers: Record<string, Record<string, string>>;
  quizScores: Record<string, number>;
};

export type StudentProgressPayload = {
  grade4: CourseProgress;
  grade5: CourseProgress;
};

export const emptyCourseProgress = (): CourseProgress => ({ lessonAnswers: {}, quizScores: {} });
export const emptyStudentProgress = (): StudentProgressPayload => ({ grade4: emptyCourseProgress(), grade5: emptyCourseProgress() });

type LegacyProgressColumns = {
  selectedLessonId?: string | null;
  lessonAnswers?: Record<string, unknown> | null;
  quizScores?: Record<string, unknown> | null;
};

function cleanCourseProgress(value: unknown): CourseProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyCourseProgress();
  const candidate = value as Partial<CourseProgress>;
  return {
    selectedLessonId: typeof candidate.selectedLessonId === 'string' ? candidate.selectedLessonId : undefined,
    lessonAnswers: candidate.lessonAnswers && typeof candidate.lessonAnswers === 'object' && !Array.isArray(candidate.lessonAnswers)
      ? candidate.lessonAnswers : {},
    quizScores: candidate.quizScores && typeof candidate.quizScores === 'object' && !Array.isArray(candidate.quizScores)
      ? candidate.quizScores : {},
  };
}

export function readStudentProgress(columns?: LegacyProgressColumns | null): StudentProgressPayload {
  if (!columns) return emptyStudentProgress();
  const storedAnswers = columns.lessonAnswers ?? {};
  const storedScores = columns.quizScores ?? {};
  const storedGrade4 = storedAnswers.grade4;
  const storedGrade5 = storedAnswers.grade5;
  if (storedGrade4 || storedGrade5) {
    const grade4 = cleanCourseProgress(storedGrade4);
    const grade5 = cleanCourseProgress(storedGrade5);
    grade4.quizScores = cleanCourseProgress({ quizScores: storedScores.grade4 }).quizScores;
    grade5.quizScores = cleanCourseProgress({ quizScores: storedScores.grade5 }).quizScores;
    return { grade4, grade5 };
  }
  return {
    grade4: {
      selectedLessonId: columns.selectedLessonId ?? undefined,
      lessonAnswers: storedAnswers as Record<string, Record<string, string>>,
      quizScores: storedScores as Record<string, number>,
    },
    grade5: emptyCourseProgress(),
  };
}

export function progressColumns(progress: StudentProgressPayload) {
  return {
    selectedLessonId: progress.grade4.selectedLessonId ?? null,
    lessonAnswers: {
      grade4: { selectedLessonId: progress.grade4.selectedLessonId, lessonAnswers: progress.grade4.lessonAnswers },
      grade5: { selectedLessonId: progress.grade5.selectedLessonId, lessonAnswers: progress.grade5.lessonAnswers },
    },
    quizScores: { grade4: progress.grade4.quizScores, grade5: progress.grade5.quizScores },
  };
}
