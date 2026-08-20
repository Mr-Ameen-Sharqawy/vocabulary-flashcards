/**
 * Writes the static course module consumed by the React app. No source lesson code is executed.
 */
import fs from "node:fs";

const inputPath = "/home/ubuntu/vocabulary-flashcards/prim4_course_cards.json";
const outputPath = "/home/ubuntu/vocabulary-flashcards/client/src/lib/course.ts";
const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));

const units = {
  1: { title: "Our Amazing Senses", arabic: "حواسنا وصحتنا", image: "/manus-storage/unit-1-senses-health_31f52044.jpg", color: "#f4c84a" },
  2: { title: "Our Community", arabic: "مجتمعنا وثقافتنا", image: "/manus-storage/unit-2-community-culture_81c52bc7.jpg", color: "#70c6b5" },
  3: { title: "Amazing Animals", arabic: "عالم الحيوانات", image: "/manus-storage/unit-3-animals_f39e0b34.jpg", color: "#ef8a75" },
  4: { title: "Explore Egypt", arabic: "اكتشف مصر", image: "/manus-storage/unit-4-egypt-places_f2e501cd.jpg", color: "#9cb8e6" },
  5: { title: "Jobs and Homes", arabic: "المهن والبيوت", image: "/manus-storage/unit-5-jobs-home_8c5f535a.jpg", color: "#d9a7d0" },
  6: { title: "Story Time", arabic: "وقت القصة", image: "/manus-storage/unit-6-hundred-dresses_054b709c.jpg", color: "#f0a24b" },
};

const lessons = input.lessons.map((lesson) => {
  const unit = units[lesson.unit];
  return {
    id: `unit-${lesson.unit}-lesson-${String(lesson.lesson).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    unit: lesson.unit,
    lesson: String(lesson.lesson),
    unitTitle: unit.title,
    unitArabic: unit.arabic,
    color: unit.color,
    title: lesson.lessonTitle.replace(/^Lesson\s*\d+\s*:\s*/i, "").replace(/^Lessons\s*\d+\s*&\s*\d+\s*:\s*/i, ""),
    sourceFile: lesson.sourceFile,
    image: unit.image,
    cards: lesson.cards.map((card) => ({ ...card, image: unit.image })),
  };
});

const typeBlock = `/**
 * Design context: Sense Lab course data provides one navigable learning route per Unit and Lesson.
 * Source: user-provided Grade 4 lesson archive, extracted as static data only.
 */

export type CourseCard = {
  id: string;
  term: string;
  sourceTerm: string;
  arabic: string;
  kind: string;
  pairedWith: string | null;
  sentence: string;
  sentenceSource: string;
  image: string;
};

export type CourseLesson = {
  id: string;
  unit: number;
  lesson: string;
  unitTitle: string;
  unitArabic: string;
  color: string;
  title: string;
  sourceFile: string;
  image: string;
  cards: CourseCard[];
};
`;

const helperBlock = [
  "export const courseUnits = Array.from(new Map(courseLessons.map((lesson) => [lesson.unit, {",
  "  unit: lesson.unit,",
  "  title: lesson.unitTitle,",
  "  arabic: lesson.unitArabic,",
  "  color: lesson.color,",
  "  image: lesson.image,",
  "}])).values());",
  "",
  "export function buildWordOptions(cards: CourseCard[], card: CourseCard) {",
  "  const index = cards.findIndex((item) => item.id === card.id);",
  "  const options = [card.term];",
  "  for (let offset = 1; options.length < 4 && offset < cards.length; offset += 1) {",
  "    const candidate = cards[(index + offset * 3) % cards.length].term;",
  "    if (!options.some((item) => item.toLowerCase() === candidate.toLowerCase())) options.push(candidate);",
  "  }",
  "  while (options.length < 4) options.push(card.term);",
  "  const correct = options.shift()!;",
  "  options.splice(index % 4, 0, correct);",
  "  return options;",
  "}",
  "",
  "export function sentenceWithBlank(card: CourseCard) {",
  "  const position = card.sentence.toLowerCase().indexOf(card.term.toLowerCase());",
  "  if (position < 0) return card.sentence;",
  "  return card.sentence.slice(0, position) + '_____' + card.sentence.slice(position + card.term.length);",
  "}",
].join("\n");

const code = `${typeBlock}\nexport const courseLessons: CourseLesson[] = ${JSON.stringify(lessons, null, 2)};\n\n${helperBlock}\n`;
fs.writeFileSync(outputPath, code);
console.log(`Wrote ${lessons.length} lessons to ${outputPath}`);
