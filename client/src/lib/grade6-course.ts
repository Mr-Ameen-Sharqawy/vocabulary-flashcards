import rawGrade6Data from "../../../grade6_selected_vocabulary_raw.json";
import type { CourseLesson } from "@/lib/course";
import { grade6CartoonImageForTerm } from "./grade6-cartoon-images";

type Grade6Record = {
  unit: number;
  lesson: string;
  section: "Main Vocabulary" | "Extra Vocabulary" | "Important Expressions and Prepositions";
  english: string;
  arabic: string;
  source_file: string;
};

const unitMeta: Record<number, { color: string; fallbackImage: string }> = {
  1: { color: "#4d9ac6", fallbackImage: "/manus-storage/grade6-003-egyptian_40146aa5.png" },
  2: { color: "#65a97d", fallbackImage: "/manus-storage/openclipart-cactus-274970_3343cd8d.png" },
  3: { color: "#d79762", fallbackImage: "/manus-storage/pixabay-wind-turbine-7107364_5e04a487.jpg" },
  4: { color: "#7d8fca", fallbackImage: "/manus-storage/openclipart-camera-189527_79378393.png" },
  5: { color: "#b981a9", fallbackImage: "/manus-storage/openclipart-rural-landscape-268296_a984fbac.png" },
};

const records = rawGrade6Data.records as Grade6Record[];

function sectionKind(section: Grade6Record["section"]) {
  if (section === "Main Vocabulary") return "main";
  if (section === "Extra Vocabulary") return "extra";
  return "expression";
}

function lessonDisplay(lesson: string) {
  return lesson.replace(/^L/i, "").replace("&", "–");
}

function lessonKey(lesson: string) {
  return lesson.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function sentenceFor(term: string) {
  return `This lesson helps us learn about ${term}.`;
}

const recordsByLesson = new Map<string, Grade6Record[]>();
for (const record of records) {
  const key = `${record.unit}:${record.lesson}`;
  const grouped = recordsByLesson.get(key) ?? [];
  grouped.push(record);
  recordsByLesson.set(key, grouped);
}

/**
 * Grade 6 uses only the three sections selected by the teacher. Cards remain
 * fully separate from Grade 4 and Grade 5; terms without reviewed artwork use
 * their lesson fallback until a dedicated cartoon is approved.
 */
export const grade6CourseLessons: CourseLesson[] = Array.from(recordsByLesson.values()).map((lessonRecords) => {
  const first = lessonRecords[0];
  const meta = unitMeta[first.unit];
  const fallbackImage = meta.fallbackImage;
  const lessonImage = grade6CartoonImageForTerm(first.english, fallbackImage);
  const displayLesson = lessonDisplay(first.lesson);

  return {
    id: `grade6-unit-${first.unit}-lesson-${lessonKey(first.lesson)}`,
    unit: first.unit,
    lesson: displayLesson,
    unitTitle: `Grade 6 Vocabulary · Unit ${first.unit}`,
    unitArabic: `مفردات الصف السادس · الوحدة ${first.unit}`,
    color: meta.color,
    title: `Vocabulary · Lesson ${displayLesson}`,
    sourceFile: first.source_file,
    image: lessonImage,
    cards: lessonRecords.map((record, index) => ({
      id: `g6-${record.unit}-${lessonKey(record.lesson)}-${index + 1}`,
      term: record.english,
      sourceTerm: record.english,
      arabic: record.arabic,
      kind: sectionKind(record.section),
      pairedWith: null,
      sentence: sentenceFor(record.english),
      sentenceSource: "curriculum-guided",
      image: grade6CartoonImageForTerm(record.english, lessonImage),
    })),
  };
});

export const grade6InteractiveLessons = grade6CourseLessons.filter((lesson) => lesson.cards.length > 0);

export const grade6CourseUnits = Array.from(new Map(grade6InteractiveLessons.map((lesson) => [lesson.unit, {
  unit: lesson.unit,
  title: lesson.unitTitle,
  arabic: lesson.unitArabic,
  color: lesson.color,
  image: lesson.image,
}])).values());
