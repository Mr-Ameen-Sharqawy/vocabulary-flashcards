import fs from "node:fs";

const source = JSON.parse(fs.readFileSync("/home/ubuntu/vocabulary-flashcards/prim4_course_cards.json", "utf8"));
const terms = new Map();

for (const lesson of source.lessons) {
  for (const card of lesson.cards) {
    const key = card.term.trim().toLowerCase();
    if (!terms.has(key)) {
      terms.set(key, {
        term: card.term,
        arabic: card.arabic,
        kind: card.kind,
        sentence: card.sentence,
        unit: lesson.unit,
        lesson: lesson.lesson,
      });
    }
  }
}

const items = [...terms.values()].sort((a, b) => a.term.localeCompare(b.term));
fs.writeFileSync(
  "/home/ubuntu/vocabulary-flashcards/cartoon_image_manifest.json",
  JSON.stringify({ total: items.length, items }, null, 2),
);
fs.writeFileSync(
  "/home/ubuntu/vocabulary-flashcards/cartoon_image_manifest.txt",
  items.map((item, index) => `${String(index + 1).padStart(3, "0")}. ${item.term} | ${item.arabic} | U${item.unit} L${item.lesson}`).join("\n"),
);
console.log(`Cartoon-image generation list confirmed: ${items.length} unique words.`);
