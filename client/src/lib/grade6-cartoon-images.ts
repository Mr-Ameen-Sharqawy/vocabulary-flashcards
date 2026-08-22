import type { CourseCard } from "@/lib/course";

function normalizeGrade6Term(term: string) {
  return term.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Reviewed Grade 6 artwork only. Unmapped terms use their lesson fallback temporarily. */
export const grade6CartoonImages: Record<string, string> = {
  "activity": "/manus-storage/grade6-001-activity_0154e51c.png",
  "bracelet": "/manus-storage/grade6-002-bracelet_e8268a4b.png",
  "egyptian": "/manus-storage/grade6-003-egyptian_40146aa5.png",
  "gate": "/manus-storage/grade6-004-gate_e78bf264.png",
  "lamp": "/manus-storage/grade6-005-lamp_0013ec02.png",
  "necklace": "/manus-storage/grade6-006-necklace_8284ed0f.png",
  "skirt": "/manus-storage/grade6-007-skirt_7ef66df3.png",
  "tool": "/manus-storage/grade6-008-tool_1100eb0e.png",
  "tourist": "/manus-storage/grade6-009-tourist_7a9a70ca.png",
  "do activities": "/manus-storage/grade6-010-do-activities_4490feae.png",
  "for a few minutes": "/manus-storage/grade6-011-for-a-few-minutes_dab00a01.png",
  "it is fun to": "/manus-storage/grade6-012-it-is-fun-to_20113848.png",
  "play with drums": "/manus-storage/grade6-013-play-with-drums_57e2260a.png",
  "spend time": "/manus-storage/grade6-014-spend-time_f68f3dcc.png",
  "with arabic designs": "/manus-storage/grade6-015-with-arabic-designs_e5f26ada.png",
  "buy souvenirs": "/manus-storage/grade6-016-buy-souvenirs_277bbce3.png",
  "make furniture": "/manus-storage/grade6-017-make-furniture_17323615.png",
  "play music": "/manus-storage/grade6-018-play-music_c4a218f2.png",
  "take photos": "/manus-storage/grade6-019-take-photos_4f1f23fb.png",
  "visit ancient sites": "/manus-storage/grade6-020-visit-ancient-sites_7a05147c.png",
  "cactus": "/manus-storage/openclipart-cactus-274970_3343cd8d.png",
  "sea turtles": "/manus-storage/openclipart-cartoon-turtle-17592_e3813a25.png",
  "mountains": "/manus-storage/openclipart-mountains-310056_c783bed9.png",
  "waterfall": "/manus-storage/pixabay-cartoon-waterfall-search-result_aeff5237.png",
  "coral reefs": "/manus-storage/pixabay-angelfish-coral-reef-10374088_57a306d5.png",
  "camera": "/manus-storage/openclipart-camera-189527_79378393.png",
  "wind turbine": "/manus-storage/pixabay-wind-turbine-7107364_5e04a487.jpg",
  "clouds": "/manus-storage/pixabay-wind-turbine-7107364_5e04a487.jpg",
  "electricity": "/manus-storage/pixabay-wind-turbine-7107364_5e04a487.jpg",
  "energy": "/manus-storage/pixabay-wind-turbine-7107364_5e04a487.jpg",
  "suitcase": "/manus-storage/pixabay-suitcase-8023523_1a68db00.png",
  "oasis": "/manus-storage/pixabay-oasis-9018077_cfd3c121.jpg",
  "desert": "/manus-storage/pixabay-oasis-9018077_cfd3c121.jpg",
  "loom": "/manus-storage/pixabay-woman-weaving-10371190_b69348d2.jpg",
  "dolphins": "/manus-storage/openclipart-dolphins-216002_fc282bf7.png",
  "snorkel": "/manus-storage/pixabay-snorkel-diver-147683_94ef5b99.png",
  "factory": "/manus-storage/pixabay-factory-3550551_d5604599.png",
  "factories": "/manus-storage/pixabay-factory-3550551_d5604599.png",
  "crops": "/manus-storage/pixabay-crops-farm-10119224_0ee9b42d.png",
  "farms": "/manus-storage/pixabay-crops-farm-10119224_0ee9b42d.png",
  "computer": "/manus-storage/pixabay-computer-2026805_d8e0c4c8.png",
  "fishermen": "/manus-storage/pixabay-fisherman-3635221_577088ff.png",
  "fisherman": "/manus-storage/pixabay-fisherman-3635221_577088ff.png",
  "repair": "/manus-storage/pixabay-repair-mechanic-8265470_b49f61f0.jpg",
  "wool": "/manus-storage/pixabay-wool-yarn-7846455_5c811107.jpg",
  "landscape": "/manus-storage/openclipart-rural-landscape-268296_a984fbac.png",
  "bench": "/manus-storage/pixabay-school-children-park-bench-9837892_dc2d32ca.png",
  "coins": "/manus-storage/pixabay-coins-gold-stacked-29516_91cd2b96.png",
  "gold": "/manus-storage/pixabay-coins-gold-stacked-29516_91cd2b96.png",
  "beach": "/manus-storage/pixabay-summer-beach-8618894_ea8cbb3d.jpg",
  "water": "/manus-storage/pixabay-summer-beach-8618894_ea8cbb3d.jpg",
  "wooden": "/manus-storage/pixabay-school-children-park-bench-9837892_dc2d32ca.png",
  "furniture": "/manus-storage/grade6-017-make-furniture_17323615.png",
};

export function grade6CartoonImageForTerm(term: string, fallback: string) {
  return grade6CartoonImages[normalizeGrade6Term(term)] ?? fallback;
}

export function grade6CartoonImageFor(card: CourseCard) {
  return grade6CartoonImageForTerm(card.sourceTerm || card.term, card.image);
}
