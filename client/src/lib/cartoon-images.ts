/**
 * Design context: Sense Lab uses an individual cartoon picture as the hidden reward for each vocabulary word. This map grows as the curriculum image library is generated.
 */
import type { CourseCard } from "@/lib/course";
import { flashcards as originalUnitOneCards } from "@/lib/flashcards";
import { uploadedCartoonImages } from "@/lib/uploaded-cartoon-images";

function normalizeTerm(term: string) {
  return term.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const originalUnitOneImages = new Map(
  originalUnitOneCards.map((card) => [normalizeTerm(card.term), card.image]),
);

const cartoonImages: Record<string, string> = {
  "a 10-year-old girl": "/manus-storage/cartoon-001-a-10-year-old-girl_95c6f15b.jpg",
  absent: "/manus-storage/cartoon-002-absent_daeeb2c1.jpg",
  "acts of kindness": "/manus-storage/cartoon-003-acts-of-kindness_5381a778.jpg",
  adventure: "/manus-storage/cartoon-004-adventure_d89f1ec0.jpg",
  "air pollution": "/manus-storage/cartoon-005-air-pollution_87f66d22.jpg",
  alarm: "/manus-storage/cartoon-006-alarm_bbe16d5e.jpg",
  amazing: "/manus-storage/cartoon-007-amazing_57c0b649.jpg",
  announce: "/manus-storage/cartoon-008-announce_947a2fb4.jpg",
  annoying: "/manus-storage/cartoon-009-annoying_9c6ce672.jpg",
  annual: "/manus-storage/cartoon-010-annual_c53bc7ed.jpg",
  ...uploadedCartoonImages,
};

export function cartoonImageFor(card: CourseCard) {
  const term = normalizeTerm(card.term);
  if (card.id.startsWith("1-1-")) return originalUnitOneImages.get(term) ?? card.image;
  return cartoonImages[term] ?? card.image;
}
