/**
 * Generates grade-4 sentence-completion contexts from the extracted curriculum.
 * The script consumes only static extracted data and validates model output before saving it.
 */
import fs from "node:fs";

const inputPath = "/home/ubuntu/vocabulary-flashcards/prim4_extracted.json";
const outputPath = "/home/ubuntu/vocabulary-flashcards/prim4_cards_with_sentences.json";
const failuresPath = "/home/ubuntu/vocabulary-flashcards/prim4_sentence_failures.json";
const apiBase = process.env.OPENAI_API_BASE;
const apiKey = process.env.OPENAI_API_KEY;

if (!apiBase || !apiKey) throw new Error("Missing OpenAI proxy credentials.");

const curriculum = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const failures = [];

function sentencePrompt(lesson) {
  const terms = lesson.vocabulary.map((item) => ({ term: item.en, arabic: item.ar, kind: item.kind }));
  const bookContext = [...lesson.keySentences, ...lesson.story].map((item) => item.en).filter(Boolean);
  return `Create one short, child-safe English sentence for each target item in this Grade 4 lesson.\n\nLesson: ${lesson.lessonTitle}\nTargets: ${JSON.stringify(terms)}\nBook sentences for context: ${JSON.stringify(bookContext)}\n\nRules:\n- Return exactly one result per target, preserving duplicates in the target list.\n- Each sentence must contain the target term exactly once, case-insensitively.\n- Prefer a supplied book sentence when it naturally contains the target; otherwise write a simple 5–12 word sentence.\n- Keep language appropriate for Egyptian Grade 4 learners.\n- Do not mention definitions, translations, AI, or instructions.\n- The sentence must make a suitable fill-in-the-blank question when the term is replaced by _____ .`;
}

async function requestSentences(lesson) {
  const response = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: "You create precise, age-appropriate English learning sentences. Output JSON only." },
        { role: "user", content: sentencePrompt(lesson) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lesson_sentences",
          strict: true,
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    term: { type: "string" },
                    sentence: { type: "string" },
                  },
                  required: ["term", "sentence"],
                  additionalProperties: false,
                },
              },
            },
            required: ["items"],
            additionalProperties: false,
          },
        },
      },
      max_completion_tokens: 5000,
      }),
    });

  if (!response.ok) throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  return JSON.parse(payload.choices?.[0]?.message?.content ?? "{}").items ?? [];
}

function fallbackSentence(term) {
  return `I can learn the word ${term}.`;
}

for (const lesson of curriculum.lessons) {
  try {
    const items = await requestSentences(lesson);
    const byPosition = lesson.vocabulary.map((target, index) => {
      const candidate = items[index];
      const validTerm = candidate && candidate.term.toLowerCase() === target.en.toLowerCase();
      const validSentence = candidate && new RegExp(target.en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(candidate.sentence);
      if (!validTerm || !validSentence) {
        failures.push({ sourceFile: lesson.sourceFile, term: target.en, reason: "invalid-model-output", received: candidate ?? null });
        return { ...target, sentence: fallbackSentence(target.en), sentenceSource: "fallback" };
      }
      return { ...target, sentence: candidate.sentence.trim(), sentenceSource: "curriculum-guided" };
    });
    lesson.cards = byPosition;
    console.log(`Prepared ${lesson.sourceFile}: ${byPosition.length} card sentences`);
  } catch (error) {
    console.error(`Failed ${lesson.sourceFile}:`, error.message);
    failures.push({ sourceFile: lesson.sourceFile, reason: "request-failure", message: error.message });
    lesson.cards = lesson.vocabulary.map((target) => ({ ...target, sentence: fallbackSentence(target.en), sentenceSource: "fallback" }));
  }
}

fs.writeFileSync(outputPath, JSON.stringify(curriculum, null, 2));
fs.writeFileSync(failuresPath, JSON.stringify(failures, null, 2));
console.log(`Saved ${curriculum.lessons.length} lessons with card sentences to ${outputPath}`);
console.log(`Validation failures: ${failures.length}`);
