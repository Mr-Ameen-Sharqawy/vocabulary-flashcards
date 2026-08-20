/**
 * Normalizes curriculum cards for student-facing display without changing their extracted source metadata.
 */
import fs from "node:fs";

const inputPath = "/home/ubuntu/vocabulary-flashcards/prim4_cards_with_sentences.json";
const outputPath = "/home/ubuntu/vocabulary-flashcards/prim4_course_cards.json";
const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));

const templateOverrides = {
  "It's fun to + inf.": {
    displayTerm: "It's fun to",
    sentence: "It's fun to plant trees with my friends.",
  },
  "proud to + inf.": {
    displayTerm: "proud to",
    sentence: "I am proud to help my community.",
  },
};

function normalizeTerm(term) {
  return term.replace(/\s*\+\s*inf\.$/i, "").replace(/\s+/g, " ").trim();
}

function containsTerm(sentence, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i").test(sentence);
}

const lessons = input.lessons.map((lesson) => ({
  ...lesson,
  cards: lesson.cards.map((card, index) => {
    const override = templateOverrides[card.en];
    const term = override?.displayTerm ?? normalizeTerm(card.en);
    const sentence = override?.sentence ?? card.sentence;
    return {
      id: `${lesson.unit}-${lesson.lesson}-${index + 1}`,
      term,
      sourceTerm: card.en,
      arabic: card.ar,
      kind: card.kind,
      pairedWith: card.pairedWith ?? null,
      sentence: containsTerm(sentence, term) ? sentence : `We can learn the word ${term}.`,
      sentenceSource: override ? "template-override" : card.sentenceSource,
    };
  }),
}));

fs.writeFileSync(outputPath, JSON.stringify({ lessons }, null, 2));
console.log(`Normalized ${lessons.length} lessons to ${outputPath}`);
