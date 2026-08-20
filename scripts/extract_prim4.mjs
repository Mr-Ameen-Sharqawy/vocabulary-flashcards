/**
 * Static curriculum extractor: reads uploaded lesson HTML as text only and never evaluates or executes it.
 */
import fs from "node:fs";
import path from "node:path";

const sourceRoot = "/home/ubuntu/prim4-source/Prim 4";
const outputPath = "/home/ubuntu/vocabulary-flashcards/prim4_extracted.json";
const summaryPath = "/home/ubuntu/vocabulary-flashcards/prim4_extraction_summary.md";

function parseString(value) {
  return value.replace(/\\"/g, '"').replace(/\\'/g, "'").trim();
}

function matchArray(source, name) {
  const matcher = new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\n\\s*\\];`);
  return source.match(matcher)?.[1] ?? "";
}

function parseFields(block, fields) {
  const results = [];
  const objectMatcher = /\{([^{}]+)\}/g;
  for (const match of block.matchAll(objectMatcher)) {
    const item = {};
    for (const field of fields) {
      const fieldMatcher = new RegExp(`${field}\\s*:\\s*(["'])([\\s\\S]*?)\\1`);
      const found = match[1].match(fieldMatcher);
      if (found) item[field] = parseString(found[2]);
    }
    if (Object.keys(item).length === fields.length) results.push(item);
  }
  return results;
}

function parseLessonId(filename) {
  const normal = filename.match(/U\s*(\d+)\s+L\s*([\d&]+)/i);
  if (normal) return { unit: Number(normal[1]), lesson: normal[2] };
  const story = filename.match(/U\s*(\d+)\s+Story/i);
  if (story) return { unit: Number(story[1]), lesson: "Story" };
  return { unit: 0, lesson: "Unknown" };
}

const files = fs.readdirSync(sourceRoot).filter((file) => file.endsWith(".html")).sort((a, b) => a.localeCompare(b));
const lessons = files.map((filename) => {
  const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
  const { unit, lesson } = parseLessonId(filename);
  const title = source.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]+>/g, "").trim() ?? "";
  const lessonTitle = source.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1].replace(/<[^>]+>/g, "").trim() ?? "";
  const mainVocab = parseFields(matchArray(source, "mainVocab"), ["en", "ar"]);
  const extraVocab = parseFields(matchArray(source, "extraVocab"), ["en", "ar"]);
  const expressions = parseFields(matchArray(source, "expressions"), ["en", "ar"]);
  const verbs = parseFields(matchArray(source, "verbs"), ["p", "s", "ar"]);
  const keySentences = parseFields(matchArray(source, "keySentences"), ["en", "ar"]);
  const story = parseFields(matchArray(source, "story"), ["s", "en", "ar"]);
  const vocabulary = [
    ...mainVocab.map((item) => ({ ...item, kind: "main" })),
    ...extraVocab.map((item) => ({ ...item, kind: "extra" })),
    ...expressions.map((item) => ({ ...item, kind: "expression" })),
    ...verbs.flatMap((item) => [
      { en: item.p, ar: item.ar, kind: "verb-present", pairedWith: item.s },
      { en: item.s, ar: item.ar, kind: "verb-past", pairedWith: item.p },
    ]),
  ];

  return {
    sourceFile: filename,
    unit,
    lesson,
    title,
    lessonTitle,
    mainVocab,
    extraVocab,
    expressions,
    verbs,
    keySentences,
    story,
    vocabulary,
  };
});

const summaryLines = [
  "# ملخص استخراج منهج الصف الرابع",
  "",
  `تمت قراءة **${lessons.length}** ملفًا كنصوص ثابتة فقط دون تشغيل ملفات الدروس.`,
  "",
  "| الوحدة | الدرس | العنوان | مفردات أساسية | مفردات إضافية | تعبيرات | أفعال | جمل |",
  "|---:|---|---|---:|---:|---:|---:|---:|",
  ...lessons.map((lesson) => `| ${lesson.unit} | ${lesson.lesson} | ${lesson.lessonTitle.replace(/\|/g, "\\|")} | ${lesson.mainVocab.length} | ${lesson.extraVocab.length} | ${lesson.expressions.length} | ${lesson.verbs.length} | ${lesson.keySentences.length} |`),
];

const totalTerms = lessons.reduce((total, lesson) => total + lesson.vocabulary.length, 0);
const distinctTerms = new Set(lessons.flatMap((lesson) => lesson.vocabulary.map((item) => item.en.toLowerCase()))).size;
summaryLines.splice(3, 0, `استُخرجت **${totalTerms}** بطاقة مفردات/تصريفات، منها **${distinctTerms}** مفردة إنجليزية مختلفة قبل إزالة التكرار بين الدروس.`);

fs.writeFileSync(outputPath, JSON.stringify({ lessons }, null, 2));
fs.writeFileSync(summaryPath, `${summaryLines.join("\n")}\n`);
console.log(`Extracted ${lessons.length} lessons to ${outputPath}`);
