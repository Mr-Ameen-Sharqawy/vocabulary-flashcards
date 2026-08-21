import fs from "node:fs";

const sourcePath = "/home/ubuntu/vocabulary-flashcards/grade5_course_raw.json";
const outputPath = "/home/ubuntu/vocabulary-flashcards/Grade_5_Image_Words_To_Copy.txt";
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const seen = new Set();
const terms = [];

for (const lesson of source.lessons) {
  for (const card of lesson.cards) {
    const key = card.term.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    terms.push(card.term);
  }
}

const perBatch = 50;
const lines = [];
for (let start = 0; start < terms.length; start += perBatch) {
  const number = String(start / perBatch + 1).padStart(2, "0");
  lines.push(`# Grade 5 · Image batch ${number} · ${Math.min(perBatch, terms.length - start)} words`);
  lines.push(...terms.slice(start, start + perBatch));
  lines.push("");
}

fs.writeFileSync(outputPath, lines.join("\n"));
console.log(`Wrote ${terms.length} unique Grade 5 terms in ${Math.ceil(terms.length / perBatch)} batches.`);
