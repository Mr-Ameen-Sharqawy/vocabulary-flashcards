/**
 * Design context: Sense Lab scales the Modern Editorial Classroom into a curriculum map—unit-first navigation, a lesson card deck, and one focused recall action at a time.
 */
import { Button } from "@/components/ui/button";
import {
  BadgeCheck,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Menu,
  RotateCcw,
  Shuffle,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buildWordOptions, courseLessons, courseUnits, sentenceWithBlank, type CourseCard } from "@/lib/course";

const logoImage = "/manus-storage/vocabulary-logo_5f3f4915.png";

export default function Home() {
  const [selectedLessonId, setSelectedLessonId] = useState(courseLessons[0].id);
  const selectedLesson = courseLessons.find((lesson) => lesson.id === selectedLessonId) ?? courseLessons[0];
  const [deck, setDeck] = useState<CourseCard[]>(selectedLesson.cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isRailOpen, setIsRailOpen] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [hasHeardCurrentWord, setHasHeardCurrentWord] = useState(false);

  useEffect(() => {
    setDeck(selectedLesson.cards);
    setCurrentIndex(0);
    setAnswers({});
    setIsCardFlipped(false);
    setHasHeardCurrentWord(false);
  }, [selectedLesson]);

  const currentCard = deck[currentIndex] ?? selectedLesson.cards[0];
  const options = useMemo(() => buildWordOptions(deck, currentCard), [deck, currentCard]);
  const sentence = useMemo(() => sentenceWithBlank(currentCard), [currentCard]);
  const selectedOption = answers[currentCard.id];
  const hasAnswered = selectedOption !== undefined;
  const isCurrentCorrect = hasAnswered && options[selectedOption] === currentCard.term;
  const reviewedCount = Object.keys(answers).length;
  const score = Object.entries(answers).filter(([cardId, optionIndex]) => {
    const card = deck.find((item) => item.id === cardId);
    return card ? buildWordOptions(deck, card)[optionIndex] === card.term : false;
  }).length;

  function resetCardState() {
    setIsCardFlipped(false);
    setHasHeardCurrentWord(false);
  }

  function chooseAnswer(optionIndex: number) {
    if (hasAnswered) return;
    setAnswers((previous) => ({ ...previous, [currentCard.id]: optionIndex }));
  }

  function moveCard(direction: -1 | 1) {
    setCurrentIndex((index) => Math.min(Math.max(index + direction, 0), deck.length - 1));
    resetCardState();
  }

  function selectLesson(lessonId: string) {
    setSelectedLessonId(lessonId);
    setIsRailOpen(false);
  }

  function shuffleDeck() {
    setDeck((previous) => [...previous].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setAnswers({});
    resetCardState();
  }

  function resetDeck() {
    setDeck(selectedLesson.cards);
    setCurrentIndex(0);
    setAnswers({});
    resetCardState();
  }

  function pronounceWord() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentCard.term.replace(/[!?.]/g, ""));
    utterance.lang = "en-US";
    utterance.rate = 0.78;
    window.speechSynthesis.speak(utterance);
  }

  function handleWordPress() {
    if (!hasHeardCurrentWord) {
      setHasHeardCurrentWord(true);
      pronounceWord();
      return;
    }
    pronounceWord();
    setIsCardFlipped(true);
  }

  return (
    <main className="sf-app" dir="rtl">
      <header className="sf-topbar">
        <div className="sf-brand" dir="ltr">
          <img className="sf-brand-logo" src={logoImage} alt="Vocabulary Flashcards logo" />
          <div>
            <p className="sf-brand-kicker">PRIMARY 4 · LITTLE WORD EXPLORERS</p>
            <p className="sf-brand-name">Vocabulary Flashcards <span>Workbook</span></p>
          </div>
        </div>
        <div className="sf-top-actions">
          <div className="sf-score-chip" aria-label={`Score ${score} out of ${reviewedCount}`} dir="ltr">
            <BadgeCheck size={17} /> <span>{score}</span><small> / {reviewedCount} right</small>
          </div>
          <button className="sf-menu-button" onClick={() => setIsRailOpen(true)} aria-label="Open course navigation">
            <Menu size={22} />
          </button>
        </div>
      </header>

      <div className="sf-shell">
        <aside className={`sf-rail ${isRailOpen ? "is-open" : ""}`} aria-label="Course navigation">
          <div className="sf-rail-mobile-head">
            <span>Course map</span>
            <button onClick={() => setIsRailOpen(false)} aria-label="Close course navigation"><X size={20} /></button>
          </div>
          <div className="sf-lesson-marker" style={{ backgroundColor: selectedLesson.color }}>
            <span>UNIT</span>
            <strong>{String(selectedLesson.unit).padStart(2, "0")}</strong>
            <em dir="ltr">LESSON {selectedLesson.lesson}</em>
          </div>

          <div className="sf-rail-copy">
            <p className="sf-rail-eyebrow">PRIMARY 4 · COURSE MAP</p>
            <h1>{selectedLesson.unitArabic}</h1>
            <p dir="ltr">{selectedLesson.title}</p>
          </div>

          <nav className="sf-course-nav" aria-label="Units and lessons">
            {courseUnits.map((unit) => {
              const unitLessons = courseLessons.filter((lesson) => lesson.unit === unit.unit);
              const activeUnit = selectedLesson.unit === unit.unit;
              return (
                <section className={`sf-unit-group ${activeUnit ? "is-active" : ""}`} key={unit.unit}>
                  <div className="sf-unit-heading">
                    <span className="sf-section-dot" style={{ backgroundColor: unit.color }} />
                    <span dir="ltr">UNIT {String(unit.unit).padStart(2, "0")}</span>
                    <small>{unitLessons.length} lessons</small>
                  </div>
                  <div className="sf-lesson-links">
                    {unitLessons.map((lesson) => {
                      const isSelected = lesson.id === selectedLesson.id;
                      return (
                        <button
                          key={lesson.id}
                          className={`sf-section-link ${isSelected ? "is-active" : ""}`}
                          onClick={() => selectLesson(lesson.id)}
                        >
                          <span className="sf-lesson-number" dir="ltr">L {lesson.lesson}</span>
                          <span className="sf-section-title" dir="ltr">{lesson.title}</span>
                          <small>{lesson.cards.length}</small>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </nav>

          <div className="sf-rail-footer">
            <div className="sf-mini-progress"><span style={{ width: `${(reviewedCount / deck.length) * 100}%`, backgroundColor: selectedLesson.color }} /></div>
            <p>{reviewedCount} من {deck.length} بطاقة تمت مراجعتها</p>
          </div>
        </aside>

        <section className="sf-workspace">
          <section className="sf-hero" style={{ backgroundImage: `url(${selectedLesson.image})` }}>
            <div className="sf-hero-content">
              <div className="sf-hero-label"><Sparkles size={15} /> Unit {selectedLesson.unit} · Lesson {selectedLesson.lesson}</div>
              <h2>{selectedLesson.unitArabic}<br /><span dir="ltr">{selectedLesson.title}</span></h2>
              <p>خلّي الطفل يسمع الكلمة، يتخيل معناها، ثم يثبتها في جملة قصيرة.</p>
            </div>
            <div className="sf-hero-note" dir="ltr"><BookOpen size={16} /> {deck.length} picture-led cards</div>
          </section>

          <div className="sf-progress-row">
            <div>
              <p className="sf-overline" dir="ltr">UNIT {selectedLesson.unit} · LESSON {selectedLesson.lesson}</p>
              <p className="sf-progress-title" dir="ltr">Card {String(currentIndex + 1).padStart(2, "0")} <span>of {deck.length}</span></p>
            </div>
            <div className="sf-progress-track" aria-label="Lesson progress"><span style={{ width: `${((currentIndex + 1) / deck.length) * 100}%`, backgroundColor: selectedLesson.color }} /></div>
          </div>

          <article className="sf-flashcard" key={currentCard.id}>
            <div className="sf-card-visual">
              <div className={`sf-flip-stage ${isCardFlipped ? "is-flipped" : ""}`}>
                <div className="sf-flip-inner">
                  <section className="sf-flip-face sf-flip-front">
                    <div className="sf-guess-content">
                      <p className="sf-guess-kicker">BEFORE YOU LISTEN</p>
                      <button
                        className={`sf-guess-word ${hasHeardCurrentWord ? "is-ready" : ""}`}
                        onClick={handleWordPress}
                        aria-label={hasHeardCurrentWord ? `Reveal the picture for ${currentCard.term}` : `Listen to ${currentCard.term}`}
                      >
                        <span dir="ltr">{currentCard.term}</span>
                      </button>
                      <p className="sf-guess-hint">{hasHeardCurrentWord ? "اضغط على الكلمة مرة ثانية لتكشف الصورة." : "اضغط على الكلمة لتسمع نطقها أولًا."}</p>
                    </div>
                    <span className="sf-guess-count" dir="ltr">{String(currentIndex + 1).padStart(2, "0")}</span>
                  </section>
                  <section className="sf-flip-face sf-flip-back" aria-label={`${currentCard.term} flipped card`}>
                    <img src={currentCard.image} alt="" aria-hidden="true" />
                    <button className="sf-word-below-photo" onClick={pronounceWord} aria-label={`Listen to ${currentCard.term} again`}>
                      <strong dir="ltr">{currentCard.term}</strong>
                      <span>{currentCard.arabic}</span>
                    </button>
                  </section>
                </div>
              </div>
            </div>

            <div className="sf-card-content">
              <div className="sf-card-term-row"><span className="sf-part-badge" dir="ltr">{currentCard.kind}</span></div>
              <p className="sf-question-label">Let&apos;s complete the sentence together</p>
              <p className="sf-sentence" dir="ltr">{sentence}</p>
              <p className="sf-question-ar">اختَر الكلمة الأنسب لتُكمل الجملة يا بطل.</p>

              <div className="sf-options" role="list">
                {options.map((option, optionIndex) => {
                  const isCorrectOption = option === currentCard.term;
                  const isSelected = selectedOption === optionIndex;
                  const resultClass = hasAnswered ? isCorrectOption ? "is-correct" : isSelected ? "is-wrong" : "is-muted" : "";
                  return (
                    <button key={`${option}-${optionIndex}`} className={`sf-option ${resultClass}`} onClick={() => chooseAnswer(optionIndex)} disabled={hasAnswered} aria-pressed={isSelected}>
                      <span className="sf-option-letter" dir="ltr">{String.fromCharCode(65 + optionIndex)}</span>
                      <span className="sf-option-word" dir="ltr">{option}</span>
                      {hasAnswered && isCorrectOption && <CircleCheck className="sf-option-icon" size={19} />}
                      {hasAnswered && isSelected && !isCorrectOption && <CircleX className="sf-option-icon" size={19} />}
                    </button>
                  );
                })}
              </div>

              {hasAnswered && (
                <div className={`sf-reveal ${isCurrentCorrect ? "is-correct" : "is-wrong"}`}>
                  <div className="sf-reveal-icon">{isCurrentCorrect ? <CircleCheck size={23} /> : <CircleX size={23} />}</div>
                  <div>
                    <p>{isCurrentCorrect ? "أحسنت! إجابة صحيحة." : "لا بأس، ثبّت الإجابة الصحيحة."}</p>
                    <h4 dir="ltr">{currentCard.term} <span>— {currentCard.arabic}</span></h4>
                    <p className="sf-example" dir="ltr">“{currentCard.sentence}”</p>
                  </div>
                </div>
              )}
            </div>
          </article>

          <div className="sf-card-controls">
            <Button className="sf-control-button" variant="outline" onClick={shuffleDeck}><Shuffle size={17} /> ابدأ ترتيبًا عشوائيًا</Button>
            <div className="sf-next-controls" dir="ltr">
              <Button className="sf-arrow-button" variant="outline" onClick={() => moveCard(-1)} disabled={currentIndex === 0} aria-label="Previous card"><ChevronLeft size={20} /></Button>
              <Button className="sf-next-button" onClick={() => moveCard(1)} disabled={currentIndex === deck.length - 1}>Next card <ChevronRight size={20} /></Button>
              <Button className="sf-arrow-button" variant="outline" onClick={resetDeck} aria-label="Reset lesson"><RotateCcw size={18} /></Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
