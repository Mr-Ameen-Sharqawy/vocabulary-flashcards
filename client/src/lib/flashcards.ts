/**
 * Design context: Sense Lab keeps the Modern Editorial Classroom approach—clear English terms, quiet Arabic support, and a single focused question per card.
 */

export type Flashcard = {
  id: number;
  term: string;
  part: string;
  arabic: string;
  definition: string;
  example: string;
  image: string;
  category: "senses" | "world" | "safety" | "verbs";
};

export const categories = [
  { id: "senses", title: "The five senses", arabic: "الحواس الخمس", color: "#f4c84a" },
  { id: "world", title: "Words around us", arabic: "كلمات من حولنا", color: "#70c6b5" },
  { id: "safety", title: "Safety & expressions", arabic: "السلامة والعبارات", color: "#f28c76" },
  { id: "verbs", title: "Verb time machine", arabic: "الأفعال والزمن الماضي", color: "#9cb8e6" },
] as const;

export const flashcards: Flashcard[] = [
  { id: 1, term: "taste", part: "noun", arabic: "حاسة التذوق", definition: "the sense that tells us the flavor of food or drink", example: "I can taste the cake.", image: "/manus-storage/Tasting_slice_of_cake_202608192114_501e40d8.jpeg", category: "senses" },
  { id: 2, term: "touch", part: "noun", arabic: "حاسة اللمس", definition: "the sense that lets us feel things with our skin", example: "Touch helps us feel soft things.", image: "/manus-storage/Handprint_on_misty_glass_202608192114_c47d90bc.jpeg", category: "senses" },
  { id: 3, term: "hearing", part: "noun", arabic: "حاسة السمع", definition: "the ability to hear sounds", example: "My hearing helps me enjoy music.", image: "/manus-storage/Sound_waves_entering_human_ear_202608192114_11c39631.jpeg", category: "senses" },
  { id: 4, term: "sight", part: "noun", arabic: "حاسة البصر", definition: "the ability to see things", example: "My sight helps me see butterflies.", image: "/manus-storage/Human_eye_reflecting_landscape_202608192114_bc6013a8.jpeg", category: "senses" },
  { id: 5, term: "smell", part: "noun", arabic: "حاسة الشم", definition: "the sense that helps us notice scents", example: "I can smell the rose.", image: "/manus-storage/Person_smelling_rose_202608192114_7a6d8a2a.jpeg", category: "senses" },
  { id: 6, term: "fire", part: "noun", arabic: "نار", definition: "heat and light made by something burning", example: "Keep away from fire.", image: "/manus-storage/Campfire_glowing_at_night_202608192114_d1e1ce48.jpeg", category: "world" },
  { id: 7, term: "smoke", part: "noun", arabic: "دخان", definition: "gray or white air that comes from something burning", example: "Smoke can make the air dirty.", image: "/manus-storage/White_smoke_swirling_on_dark_202608192114_5fef98e7.jpeg", category: "world" },
  { id: 8, term: "voices", part: "noun · plural", arabic: "أصوات", definition: "sounds people make when they speak or sing", example: "I can hear voices in the room.", image: "/manus-storage/Abstract_visualization_of_voices_202608192114_d957662e.jpeg", category: "world" },
  { id: 9, term: "tongue", part: "noun", arabic: "لسان", definition: "the part of the mouth used for tasting and speaking", example: "My tongue helps me taste.", image: "/manus-storage/Pink_tongue_showing_202608192114_df781eb6.jpeg", category: "world" },
  { id: 10, term: "soft", part: "adjective", arabic: "ناعم", definition: "pleasant to touch, not hard or rough", example: "This velvet is soft.", image: "/manus-storage/Hands_feeling_soft_velvet_fabric_202608192114_878332f8.jpeg", category: "world" },
  { id: 11, term: "butterflies", part: "noun · plural", arabic: "فراشات", definition: "colorful insects with large wings", example: "The butterflies have bright wings.", image: "/manus-storage/Butterflies_fluttering_in_meadow_202608192114_f2470ef1.jpeg", category: "world" },
  { id: 12, term: "excellent", part: "adjective", arabic: "ممتاز", definition: "extremely good", example: "Your answer is excellent!", image: "/manus-storage/Gold_medal_rating_symbol_202608192114_730125a0.jpeg", category: "world" },
  { id: 13, term: "colorful", part: "adjective", arabic: "مُلوّن", definition: "having many bright colours", example: "The painting is colorful.", image: "/manus-storage/Multicolored_paints_splashing_202608192114_8d02a10f.jpeg", category: "world" },
  { id: 14, term: "hard", part: "adjective", arabic: "صلب", definition: "firm and not soft", example: "Granite is hard.", image: "/manus-storage/Close-up_of_granite_rock_202608192114_0a756bdf.jpeg", category: "world" },
  { id: 15, term: "loud noise", part: "noun phrase", arabic: "ضوضاء عالية", definition: "a strong sound that is not quiet", example: "A loud noise can hurt our ears.", image: "/manus-storage/Person_covering_ears_near_speaker_202608192114_5fd77868.jpeg", category: "world" },
  { id: 16, term: "learn about", part: "verb phrase", arabic: "يتعلّم عن", definition: "to get new information about a topic", example: "We learn about the five senses.", image: "/manus-storage/learn-about_166096c8.jpeg", category: "safety" },
  { id: 17, term: "stay safe", part: "verb phrase", arabic: "ابقَ آمنًا", definition: "to keep away from danger", example: "Stay safe near fire.", image: "/manus-storage/Protective_shield_or_home_shelter_202608192114_0e6599e8.jpeg", category: "safety" },
  { id: 18, term: "What a beautiful day!", part: "expression", arabic: "يا له من يوم جميل!", definition: "a sentence that says the day is very nice", example: "What a beautiful day! Let's play outside.", image: "/manus-storage/Sunlit_landscape_with_green_hills_202608192114_119f5e97.jpeg", category: "safety" },
  { id: 19, term: "talk about", part: "verb phrase", arabic: "يتحدث عن", definition: "to speak about a person or a thing", example: "We talk about our senses.", image: "/manus-storage/Two_silhouettes_in_conversation_202608192114_7b8c01c6.jpeg", category: "safety" },
  { id: 20, term: "use", part: "verb · present", arabic: "يستخدم", definition: "to do something with a tool or thing", example: "I use a pencil at school.", image: "/manus-storage/Hand_holding_and_using_pencil_202608192114_050a0ab2.jpeg", category: "verbs" },
  { id: 21, term: "used", part: "verb · past of use", arabic: "استخدم", definition: "the past form of use", example: "She used a pencil yesterday.", image: "/manus-storage/Vintage_record_player_playing_music_202608192114_be6002f0.jpeg", category: "verbs" },
  { id: 22, term: "taste", part: "verb · present", arabic: "يتذوق", definition: "to try food or drink with your mouth", example: "Taste the strawberry.", image: "/manus-storage/Tasting_slice_of_cake_202608192114_501e40d8.jpeg", category: "verbs" },
  { id: 23, term: "tasted", part: "verb · past of taste", arabic: "تذوّق", definition: "the past form of taste", example: "I tasted the cake.", image: "/manus-storage/Tasting_slice_of_cake_202608192114_501e40d8.jpeg", category: "verbs" },
  { id: 24, term: "touch", part: "verb · present", arabic: "يلمس", definition: "to put your hand on something or feel it", example: "Please touch the fabric.", image: "/manus-storage/Handprint_on_misty_glass_202608192114_c47d90bc.jpeg", category: "verbs" },
  { id: 25, term: "touched", part: "verb · past of touch", arabic: "لمس", definition: "the past form of touch", example: "He touched the glass.", image: "/manus-storage/Handprint_on_misty_glass_202608192114_c47d90bc.jpeg", category: "verbs" },
  { id: 26, term: "hear", part: "verb · present", arabic: "يسمع", definition: "to notice a sound with your ears", example: "I hear music.", image: "/manus-storage/Child_listening_to_seashell_202608192114_4fe86a6b.jpeg", category: "verbs" },
  { id: 27, term: "heard", part: "verb · past of hear", arabic: "سمع", definition: "the past form of hear", example: "I heard music yesterday.", image: "/manus-storage/Old_radio_transmitting_sound_waves_202608192114_a4178750.jpeg", category: "verbs" },
  { id: 28, term: "sing", part: "verb · present", arabic: "يُغنّي", definition: "to make music with your voice", example: "They sing a song.", image: "/manus-storage/sing_058de30d.jpeg", category: "verbs" },
  { id: 29, term: "sang", part: "verb · past of sing", arabic: "غنّى", definition: "the past form of sing", example: "They sang a song yesterday.", image: "/manus-storage/sing_058de30d.jpeg", category: "verbs" },
  { id: 30, term: "understand", part: "verb · present", arabic: "يفهم", definition: "to know the meaning of something", example: "I understand the lesson.", image: "/manus-storage/Lightbulb_appearing_above_head_202608192114_37cadbb5.jpeg", category: "verbs" },
  { id: 31, term: "understood", part: "verb · past of understand", arabic: "فهم", definition: "the past form of understand", example: "I understood the lesson.", image: "/manus-storage/checkmark_fe1b2568.jpeg", category: "verbs" },
];

export function buildOptions(card: Flashcard) {
  const cardIndex = flashcards.findIndex((item) => item.id === card.id);
  const offsets = [5, 12, 19];
  const choices = [
    card.term,
    ...offsets.map((offset) => flashcards[(cardIndex + offset) % flashcards.length].term),
  ];
  const correctIndex = card.id % 4;
  const [correct] = choices.splice(0, 1);
  choices.splice(correctIndex, 0, correct);
  return choices;
}

export function sentenceWithBlank(card: Flashcard) {
  const escapedTerm = card.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return card.example.replace(new RegExp(escapedTerm, "i"), "_____");
}
