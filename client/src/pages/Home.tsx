/**
 * Design context: Sense Lab scales the Modern Editorial Classroom into a curriculum map—unit-first navigation, a lesson card deck, and one focused recall action at a time.
 */
import { Button } from "@/components/ui/button";
import {
  Award,
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
import { cartoonImageFor } from "@/lib/cartoon-images";
import { grade5CourseLessons, grade5CourseUnits } from "@/lib/grade5-course";
import { grade5CartoonImageFor } from "@/lib/grade5-cartoon-images";

const logoImage = "/manus-storage/vocabulary-logo_5f3f4915.png";
type SavedProgress = {
  selectedLessonId?: string;
  lessonAnswers: Record<string, Record<string, string>>;
  quizScores: Record<string, number>;
};

type HomeProps = {
  grade?: "grade4" | "grade5";
  initialProgress?: SavedProgress;
  onProgressChange?: (progress: SavedProgress) => void;
  studentName?: string;
  onStudentLogout?: () => void;
};

export default function Home({ grade = "grade4", initialProgress, onProgressChange, studentName, onStudentLogout }: HomeProps) {
  const isGrade5 = grade === "grade5";
  const activeCourseLessons = isGrade5 ? grade5CourseLessons : courseLessons;
  const activeCourseUnits = isGrade5 ? grade5CourseUnits : courseUnits;
  const progressStorageKey = isGrade5 ? "sense-lab-primary-5-progress-v1" : "sense-lab-primary-4-progress-v1";
  const [selectedLessonId, setSelectedLessonId] = useState(activeCourseLessons[0].id);
  const selectedLesson = activeCourseLessons.find((lesson) => lesson.id === selectedLessonId) ?? activeCourseLessons[0];
  const [deck, setDeck] = useState<CourseCard[]>(selectedLesson.cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lessonAnswers, setLessonAnswers] = useState<SavedProgress["lessonAnswers"]>({});
  const [quizScores, setQuizScores] = useState<SavedProgress["quizScores"]>({});
  const [isRailOpen, setIsRailOpen] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [hasHeardCurrentWord, setHasHeardCurrentWord] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [quizUnit, setQuizUnit] = useState<number | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = initialProgress ?? JSON.parse(window.localStorage.getItem(progressStorageKey) ?? "{}") as Partial<SavedProgress>;
      if (saved.selectedLessonId && activeCourseLessons.some((lesson) => lesson.id === saved.selectedLessonId)) setSelectedLessonId(saved.selectedLessonId);
      if (saved.lessonAnswers) setLessonAnswers(saved.lessonAnswers);
      if (saved.quizScores) setQuizScores(saved.quizScores);
    } catch {
      // Ignore malformed local data and start a fresh learning journey.
    } finally {
      setStorageReady(true);
    }
  }, [initialProgress, activeCourseLessons]);

  useEffect(() => {
    if (!storageReady) return;
    const payload: SavedProgress = { selectedLessonId, lessonAnswers, quizScores };
    window.localStorage.setItem(progressStorageKey, JSON.stringify(payload));
    onProgressChange?.(payload);
  }, [lessonAnswers, quizScores, selectedLessonId, storageReady, onProgressChange]);

  useEffect(() => {
    setDeck(selectedLesson.cards);
    setCurrentIndex(0);
    setIsCardFlipped(false);
    setHasHeardCurrentWord(false);
  }, [selectedLesson]);

  const currentCard = deck[currentIndex] ?? selectedLesson.cards[0];
  const options = useMemo(() => buildWordOptions(deck, currentCard), [deck, currentCard]);
  const sentence = useMemo(() => sentenceWithBlank(currentCard), [currentCard]);
  const answers = lessonAnswers[selectedLessonId] ?? {};
  const selectedAnswer = answers[currentCard.id];
  const selectedOption = selectedAnswer === undefined ? undefined : options.findIndex((option) => option === selectedAnswer);
  const hasAnswered = selectedAnswer !== undefined;
  const isCurrentCorrect = selectedAnswer === currentCard.term;
  const reviewedCount = Object.keys(answers).length;
  const score = Object.entries(answers).filter(([cardId, selectedWord]) => {
    const card = deck.find((item) => item.id === cardId);
    return card ? selectedWord === card.term : false;
  }).length;
  const totalReviewed = Object.values(lessonAnswers).reduce((sum, result) => sum + Object.keys(result).length, 0);
  const totalCorrect = Object.entries(lessonAnswers).reduce((sum, [lessonId, result]) => {
      const lesson = activeCourseLessons.find((item) => item.id === lessonId);
    return sum + Object.entries(result).filter(([cardId, selectedWord]) => lesson?.cards.find((card) => card.id === cardId)?.term === selectedWord).length;
  }, 0);

  const activeQuizCards = useMemo(() => {
    if (quizUnit === null) return [];
    const seen = new Set<string>();
    return activeCourseLessons
      .filter((lesson) => lesson.unit === quizUnit)
      .flatMap((lesson) => lesson.cards)
      .filter((card) => {
        const key = card.term.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);
  }, [quizUnit, activeCourseLessons]);
  const activeQuizCard = activeQuizCards[quizIndex];
  const activeQuizOptions = useMemo(
    () => (activeQuizCard ? buildWordOptions(activeQuizCards, activeQuizCard) : []),
    [activeQuizCard, activeQuizCards],
  );
  const activeQuizAnswer = activeQuizCard ? quizAnswers[activeQuizCard.id] : undefined;
  const quizCompleted = activeQuizCards.length > 0 && Object.keys(quizAnswers).length === activeQuizCards.length;
  const quizCorrect = Object.entries(quizAnswers).filter(([cardId, answer]) => activeQuizCards.find((card) => card.id === cardId)?.term === answer).length;

  function resetCardState() {
    setIsCardFlipped(false);
    setHasHeardCurrentWord(false);
  }

  function playSuccessSound() {
    const AudioContext = window.AudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + index * 0.11 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.11 + 0.16);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + index * 0.11);
      oscillator.stop(context.currentTime + index * 0.11 + 0.18);
    });
  }

  function chooseAnswer(optionIndex: number) {
    if (hasAnswered) return;
    const selectedWord = options[optionIndex];
    setLessonAnswers((previous) => ({
      ...previous,
      [selectedLessonId]: { ...(previous[selectedLessonId] ?? {}), [currentCard.id]: selectedWord },
    }));
    if (selectedWord === currentCard.term) {
      playSuccessSound();
      setCelebration("أحسنت! إجابة صحيحة");
      window.setTimeout(() => setCelebration(null), 1600);
    }
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
    resetCardState();
  }

  function resetDeck() {
    setDeck(selectedLesson.cards);
    setCurrentIndex(0);
    setLessonAnswers((previous) => {
      const next = { ...previous };
      delete next[selectedLessonId];
      return next;
    });
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

  function openQuiz(unit: number) {
    setQuizUnit(unit);
    setQuizIndex(0);
    setQuizAnswers({});
    setIsRailOpen(false);
  }

  function chooseQuizAnswer(optionIndex: number) {
    if (!activeQuizCard || activeQuizAnswer !== undefined) return;
    const selectedWord = activeQuizOptions[optionIndex];
    setQuizAnswers((previous) => ({ ...previous, [activeQuizCard.id]: selectedWord }));
    if (selectedWord === activeQuizCard.term) playSuccessSound();
  }

  function closeQuiz(saveScore = false) {
    if (saveScore && quizUnit !== null) setQuizScores((previous) => ({ ...previous, [quizUnit]: Math.max(previous[quizUnit] ?? 0, quizCorrect) }));
    setQuizUnit(null);
  }

  return (
    <main className="sf-app" dir="rtl">
      <header className="sf-topbar">
        <div className="sf-brand" dir="ltr">
          <img className="sf-brand-logo" src={logoImage} alt="Vocabulary Flashcards logo" />
          <div>
            <p className="sf-brand-kicker">{isGrade5 ? "PRIMARY 5" : "PRIMARY 4"} · LITTLE WORD EXPLORERS</p>
            <p className="sf-brand-name">Vocabulary Flashcards <span>Workbook</span></p>
          </div>
        </div>
          <div className="sf-top-actions">
            {studentName && <button className="sf-student-chip" onClick={onStudentLogout} title="تسجيل الخروج"><span>{studentName}</span><small>خروج</small></button>}
            <div className="sf-score-chip" aria-label={`Score ${totalCorrect} out of ${totalReviewed}`} dir="ltr">
            <BadgeCheck size={17} /> <span>{totalCorrect}</span><small> / {totalReviewed} right</small>
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
            <p className="sf-rail-eyebrow">{isGrade5 ? "PRIMARY 5" : "PRIMARY 4"} · COURSE MAP</p>
            <h1>{selectedLesson.unitArabic}</h1>
            <p dir="ltr">{selectedLesson.title}</p>
          </div>

          <nav className="sf-course-nav" aria-label="Units and lessons">
            {activeCourseUnits.map((unit) => {
              const unitLessons = activeCourseLessons.filter((lesson) => lesson.unit === unit.unit);
              const activeUnit = selectedLesson.unit === unit.unit;
              return (
                <section className={`sf-unit-group ${activeUnit ? "is-active" : ""}`} key={unit.unit}>
                  <div className="sf-unit-heading">
                    <span className="sf-section-dot" style={{ backgroundColor: unit.color }} />
                    <span dir="ltr">UNIT {String(unit.unit).padStart(2, "0")}</span>
                    <small>{quizScores[unit.unit] ? `quiz ${quizScores[unit.unit]}/5` : `${unitLessons.length} lessons`}</small>
                    <button className="sf-unit-quiz-button" onClick={() => openQuiz(unit.unit)} aria-label={`Start Unit ${unit.unit} quiz`}><Award size={14} /></button>
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
                    <img src={isGrade5 ? grade5CartoonImageFor(currentCard) : cartoonImageFor(currentCard)} alt={`Cartoon illustration for ${currentCard.term}`} />
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
      {celebration && <div className="sf-celebration" role="status">{celebration}</div>}
      {quizUnit !== null && activeQuizCard && (
        <div className="sf-quiz-overlay" role="dialog" aria-modal="true" aria-label={`Unit ${quizUnit} quiz`}>
          <section className="sf-quiz-card" dir="rtl">
            <button className="sf-quiz-close" onClick={() => closeQuiz(false)} aria-label="Close quiz"><X size={20} /></button>
            <p className="sf-quiz-eyebrow" dir="ltr">UNIT {quizUnit} · QUICK CHECK</p>
            {quizCompleted ? (
              <div className="sf-quiz-result">
                <Award size={48} />
                <h3>أحسنت يا بطل!</h3>
                <p>نتيجتك في اختبار الوحدة: <strong dir="ltr">{quizCorrect} / {activeQuizCards.length}</strong></p>
                <Button className="sf-next-button" onClick={() => closeQuiz(true)}>حفظ النتيجة</Button>
              </div>
            ) : (
              <>
                <div className="sf-quiz-progress"><span style={{ width: `${((quizIndex + 1) / activeQuizCards.length) * 100}%` }} /></div>
                <p className="sf-quiz-count" dir="ltr">Question {quizIndex + 1} of {activeQuizCards.length}</p>
                <p className="sf-quiz-sentence" dir="ltr">{sentenceWithBlank(activeQuizCard)}</p>
                <div className="sf-options">
                  {activeQuizOptions.map((option, index) => {
                    const selected = activeQuizAnswer === option;
                    const correct = option === activeQuizCard.term;
                    const resultClass = activeQuizAnswer === undefined ? "" : correct ? "is-correct" : selected ? "is-wrong" : "is-muted";
                    return <button key={option} className={`sf-option ${resultClass}`} onClick={() => chooseQuizAnswer(index)} disabled={activeQuizAnswer !== undefined}><span className="sf-option-letter">{String.fromCharCode(65 + index)}</span><span className="sf-option-word" dir="ltr">{option}</span></button>;
                  })}
                </div>
                {activeQuizAnswer !== undefined && <Button className="sf-next-button sf-quiz-next" onClick={() => setQuizIndex((index) => Math.min(index + 1, activeQuizCards.length - 1))}>السؤال التالي <ChevronLeft size={18} /></Button>}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
