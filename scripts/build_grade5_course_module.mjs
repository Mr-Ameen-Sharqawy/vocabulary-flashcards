import fs from 'node:fs';

const root = '/home/ubuntu/vocabulary-flashcards';
const raw = JSON.parse(fs.readFileSync(`${root}/grade5_course_raw.json`, 'utf8'));
const combinedMatchesPath = `${root}/grade5_combined_image_matches.json`;
const matchesPath = fs.existsSync(combinedMatchesPath) ? combinedMatchesPath : `${root}/grade5_final_image_matches.json`;
const matches = JSON.parse(fs.readFileSync(matchesPath, 'utf8')).matches;
const uploadOutput = fs.readFileSync(`${root}/grade5_upload_output.txt`, 'utf8');

const pathToUrl = new Map();
for (const line of uploadOutput.split('\n')) {
  const found = line.match(/^\[SUCCESS\] (.+) -> (\/manus-storage\/[^\s]+)$/);
  if (found) pathToUrl.set(found[1], found[2]);
}

function normalize(value) {
  return value.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

const imageByTerm = {};
for (const item of matches) {
  if (item.source?.startsWith('grade4_reuse')) {
    imageByTerm[normalize(item.term)] = item.image_path;
    continue;
  }
  const localUploadPath = JSON.parse(fs.readFileSync(`${root}/grade5_upload_manifest.json`, 'utf8')).assets
    .find((asset) => asset.image_name === item.image_name)?.local_upload_path;
  const url = localUploadPath ? pathToUrl.get(localUploadPath) : undefined;
  if (url) imageByTerm[normalize(item.term)] = url;
}

const unitMeta = {
  1: { title: 'Life Along the Nile', arabic: 'الحياة بجانب النيل', color: '#55a8d9', imageTerm: 'The Nile River' },
  2: { title: 'Sports for Better Health', arabic: 'الرياضة لصحة أفضل', color: '#70c6b5', imageTerm: 'sports' },
  3: { title: 'Weather Wonders', arabic: 'عجائب الطقس', color: '#9cb8e6', imageTerm: 'lightning' },
  4: { title: 'Places in Our Community', arabic: 'أماكن في مجتمعنا', color: '#ef8a75', imageTerm: 'New Administrative Capital' },
  5: { title: 'The Gifts of Nature', arabic: 'هدايا الطبيعة', color: '#d9a7d0', imageTerm: 'fossil fuel' },
  6: { title: 'Story Map', arabic: 'خريطة القصة', color: '#f0a24b', imageTerm: 'ocean' },
};

const fallbackImage = '/manus-storage/vocabulary-logo_5f3f4915.png';
const lessons = raw.lessons.map((lesson) => {
  const meta = unitMeta[lesson.unit];
  const firstCardImage = lesson.cards.map((card) => imageByTerm[normalize(card.term)]).find(Boolean);
  const unitImage = imageByTerm[normalize(meta.imageTerm)] ?? firstCardImage ?? fallbackImage;
  const lessonTitle = lesson.title.replace(/^Lesson\s*\d+\s*:\s*/i, '').replace(/^Story Time\s*-\s*/i, '');
  return {
    id: `grade5-unit-${lesson.unit}-lesson-${String(lesson.lesson).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
    unit: lesson.unit,
    lesson: String(lesson.lesson),
    unitTitle: meta.title,
    unitArabic: meta.arabic,
    color: meta.color,
    title: lessonTitle,
    sourceFile: lesson.source_file,
    image: unitImage,
    cards: lesson.cards.map((card, index) => ({
      id: `g5-${lesson.unit}-${lesson.lesson}-${index + 1}`,
      term: card.term,
      sourceTerm: card.term,
      arabic: card.arabic,
      kind: card.kind,
      pairedWith: card.pairedWith ?? null,
      sentence: card.sentence,
      sentenceSource: card.sentenceSource,
      image: unitImage,
    })),
  };
});

const imageCode = `/** Grade 5 cartoon images uploaded by the project owner; no generated watermark assets are used. */\nimport type { CourseCard } from '@/lib/course';\n\nfunction normalizeGrade5Term(term: string) {\n  return term.toLowerCase().replace(/\\([^)]*\\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();\n}\n\nexport const grade5CartoonImages: Record<string, string> = ${JSON.stringify(imageByTerm, null, 2)};\n\nexport function grade5CartoonImageFor(card: CourseCard) {\n  return grade5CartoonImages[normalizeGrade5Term(card.term)] ?? card.image;\n}\n`;
const courseCode = `/**\n * Grade 5 curriculum data extracted from the user-provided Primary 5 lesson archive.\n * The module is intentionally separate from Grade 4 to keep course content and progress independent.\n */\nimport type { CourseLesson } from '@/lib/course';\n\nexport const grade5CourseLessons: CourseLesson[] = ${JSON.stringify(lessons, null, 2)};\n\nexport const grade5CourseUnits = Array.from(new Map(grade5CourseLessons.map((lesson) => [lesson.unit, {\n  unit: lesson.unit,\n  title: lesson.unitTitle,\n  arabic: lesson.unitArabic,\n  color: lesson.color,\n  image: lesson.image,\n}])).values());\n`;

fs.writeFileSync(`${root}/client/src/lib/grade5-cartoon-images.ts`, imageCode);
fs.writeFileSync(`${root}/client/src/lib/grade5-course.ts`, courseCode);
console.log(`Wrote ${lessons.length} Grade 5 lessons and ${Object.keys(imageByTerm).length} uploaded cartoon-image links.`);
