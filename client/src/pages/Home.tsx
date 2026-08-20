/**
 * Design context: Sense Lab uses a Modern Editorial Classroom layout—an asymmetric lesson rail, a calm paper workspace, and one purposeful flashcard at a time.
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
import { useMemo, useState } from "react";
import { buildOptions, categories, flashcards, type Flashcard } from "@/lib/flashcards";

const heroImage = "/manus-storage/senses-safety-hero_e652dfff.jpg";
const logoImage = "/manus-storage/vocabulary-logo_5f3f4915.png";

export default function Home() {
  const [deck, setDeck] = useState<Flashcard[]>(flashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isRailOpen, setIsRailOpen] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [hasHeardCurrentWord, setHasHeardCurrentWord] = useState(false);

  const currentCard = deck[currentIndex];
  const options = useMemo(() => buildOptions(currentCard), [currentCard]);
  const selectedOption = answers[currentCard.id];
  const hasAnswered = selectedOption !== undefined;
  const isCurrentCorrect = hasAnswered && options[selectedOption] === currentCard.definition;
  const reviewedCount = Object.keys(answers).length;
  const score = Object.entries(answers).filter(([cardId, optionIndex]) => {
    const card = flashcards.find((item) => item.id === Number(cardId));
    return card ? buildOptions(card)[optionIndex] === card.definition : false;
  }).length;

  const currentCategory = categories.find((category) => category.id === currentCard.category);

  function chooseAnswer(optionIndex: number) {
    if (hasAnswered) return;
    setAnswers((previous) => ({ ...previous, [currentCard.id]: optionIndex }));
  }

  function moveCard(direction: -1 | 1) {
    const nextIndex = Math.min(Math.max(currentIndex + direction, 0), deck.length - 1);
    setCurrentIndex(nextIndex);
    setIsCardFlipped(false);
    setHasHeardCurrentWord(false);
  }

  function moveToCategory(categoryId: Flashcard["category"]) {
    const target = deck.findIndex((card) => card.category === categoryId);
    if (target >= 0) setCurrentIndex(target);
    setIsCardFlipped(false);
    setHasHeardCurrentWord(false);
    setIsRailOpen(false);
  }

  function shuffleDeck() {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setAnswers({});
    setIsCardFlipped(false);
    setHasHeardCurrentWord(false);
  }

  function resetDeck() {
    setDeck(flashcards);
    setCurrentIndex(0);
    setAnswers({});
    setIsCardFlipped(false);
    setHasHeardCurrentWord(false);
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

    setIsCardFlipped(true);
  }

  return (
    <main className="sf-app" dir="rtl">
      <header className="sf-topbar">
        <div className="sf-brand" dir="ltr">
          <img className="sf-brand-logo" src={logoImage} alt="Vocabulary Flashcards logo" />
          <div>
            <p className="sf-brand-kicker">ENGLISH · GRADE SCHOOL</p>
            <p className="sf-brand-name">Vocabulary Flashcards</p>
          </div>
        </div>
        <div className="sf-top-actions">
          <div className="sf-score-chip" aria-label={`Score ${score} out of ${reviewedCount}`} dir="ltr">
            <BadgeCheck size={17} /> <span>{score}</span><small> / {reviewedCount} right</small>
          </div>
          <button className="sf-menu-button" onClick={() => setIsRailOpen(true)} aria-label="Open lesson navigation">
            <Menu size={22} />
          </button>
        </div>
      </header>

      <div className="sf-shell">
        <aside className={`sf-rail ${isRailOpen ? "is-open" : ""}`} aria-label="Lesson sections">
          <div className="sf-rail-mobile-head">
            <span>Lesson map</span>
            <button onClick={() => setIsRailOpen(false)} aria-label="Close lesson navigation"><X size={20} /></button>
          </div>
          <div className="sf-lesson-marker">
            <span>LESSON</span>
            <strong>02</strong>
            <em>Sense Lab</em>
          </div>

          <div className="sf-rail-copy">
            <p className="sf-rail-eyebrow">YOUR ROUTE</p>
            <h1>الحواس<br />والسلامة</h1>
            <p>بطاقات سريعة: اختَر المعنى، ثم ثبّت الكلمة بالصورة والجملة.</p>
          </div>

          <nav className="sf-section-nav">
            {categories.map((category) => {
              const inCategory = deck.filter((card) => card.category === category.id);
              const complete = inCategory.filter((card) => answers[card.id] !== undefined).length;
              const active = currentCard.category === category.id;
              return (
                <button
                  key={category.id}
                  className={`sf-section-link ${active ? "is-active" : ""}`}
                  onClick={() => moveToCategory(category.id)}
                >
                  <span className="sf-section-dot" style={{ backgroundColor: category.color }} />
                  <span className="sf-section-title" dir="ltr">{category.title}</span>
                  <small>{complete}/{inCategory.length}</small>
                </button>
              );
            })}
          </nav>

          <div className="sf-rail-footer">
            <div className="sf-mini-progress"><span style={{ width: `${(reviewedCount / deck.length) * 100}%` }} /></div>
            <p>{reviewedCount} من {deck.length} بطاقة تمت مراجعتها</p>
          </div>
        </aside>

        <section className="sf-workspace">
          <section className="sf-hero" style={{ backgroundImage: `url(${heroImage})` }}>
            <div className="sf-hero-content">
              <div className="sf-hero-label"><Sparkles size={15} /> Practice, don&apos;t just memorize</div>
              <h2>اختَر المعنى.<br /><span>ثبّت الكلمة.</span></h2>
              <p>مراجعة تفاعلية لمفردات الحواس والسلامة، مع صورك وجمل قصيرة تساعد على التذكر.</p>
            </div>
            <div className="sf-hero-note" dir="ltr"><BookOpen size={16} /> 31 picture-led cards</div>
          </section>

          <div className="sf-progress-row">
            <div>
              <p className="sf-overline">{currentCategory?.arabic}</p>
              <p className="sf-progress-title" dir="ltr">Card {String(currentIndex + 1).padStart(2, "0")} <span>of {deck.length}</span></p>
            </div>
            <div className="sf-progress-track" aria-label="Lesson progress"><span style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }} /></div>
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
                      <p className="sf-guess-hint">
                        {hasHeardCurrentWord
                          ? "اضغط على الكلمة مرة ثانية لتكشف الصورة."
                          : "اضغط على الكلمة لتسمع نطقها أولًا."}
                      </p>
                    </div>
                    <span className="sf-guess-count" dir="ltr">{String(currentIndex + 1).padStart(2, "0")}</span>
                  </section>
                  <section className="sf-flip-face sf-flip-back" aria-label={`${currentCard.term} flipped card`}>
                    <img src={currentCard.image} alt="" aria-hidden="true" />
                    <div className="sf-word-below-photo" dir="ltr">
                      <strong>{currentCard.term}</strong>
                      <span>{currentCard.arabic}</span>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            <div className="sf-card-content">
              <div className="sf-card-term-row">
                <span className="sf-part-badge">{currentCard.part}</span>
              </div>
              <p className="sf-question-label">Choose the correct definition</p>
              <p className="sf-question-ar">اختر التعريف الصحيح للكلمة.</p>

              <div className="sf-options" role="list">
                {options.map((option, optionIndex) => {
                  const isCorrectOption = option === currentCard.definition;
                  const isSelected = selectedOption === optionIndex;
                  const resultClass = hasAnswered
                    ? isCorrectOption
                      ? "is-correct"
                      : isSelected
                        ? "is-wrong"
                        : "is-muted"
                    : "";
                  return (
                    <button
                      key={option}
                      className={`sf-option ${resultClass}`}
                      onClick={() => chooseAnswer(optionIndex)}
                      disabled={hasAnswered}
                      aria-pressed={isSelected}
                    >
                      <span className="sf-option-letter" dir="ltr">{String.fromCharCode(65 + optionIndex)}</span>
                      <span dir="ltr">{option}</span>
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
                    <p className="sf-example" dir="ltr">“{currentCard.example}”</p>
                  </div>
                </div>
              )}
            </div>
          </article>

          <div className="sf-card-controls">
            <Button className="sf-control-button" variant="outline" onClick={shuffleDeck}><Shuffle size={17} /> ابدأ ترتيبًا عشوائيًا</Button>
            <div className="sf-next-controls" dir="ltr">
              <Button className="sf-arrow-button" variant="outline" onClick={() => moveCard(-1)} disabled={currentIndex === 0} aria-label="Previous card"><ChevronLeft size={20} /></Button>
              <Button className="sf-next-button" onClick={() => moveCard(1)} disabled={currentIndex === deck.length - 1}>
                Next card <ChevronRight size={20} />
              </Button>
              <Button className="sf-arrow-button" variant="outline" onClick={resetDeck} aria-label="Reset deck"><RotateCcw size={18} /></Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
