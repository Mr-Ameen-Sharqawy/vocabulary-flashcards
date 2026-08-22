/**
 * Design context: A calm, focused grade gateway lets students choose their learning path without mixing course content.
 */
import { ArrowLeft, BookOpen, LogOut, Sparkles } from "lucide-react";

type GradeSelectorProps = {
  studentName?: string;
  allowedGrades?: Array<"grade4" | "grade5" | "grade6">;
  onSelectGrade4: () => void;
  onSelectGrade5: () => void;
  onSelectGrade6: () => void;
  onLogout?: () => void;
};

export default function GradeSelector({ studentName, allowedGrades = ["grade4", "grade5", "grade6"], onSelectGrade4, onSelectGrade5, onSelectGrade6, onLogout }: GradeSelectorProps) {
  return (
    <main className="sf-grade-shell" dir="rtl">
      <header className="sf-grade-topbar">
        <div><span>VOCABULARY JOURNEY</span><strong>اختيار الصف</strong></div>
        {studentName && onLogout ? <button className="sf-student-chip" onClick={onLogout}><span>{studentName}</span><small>خروج</small><LogOut size={15} /></button> : <span className="sf-grade-public-note">بوابة الطلاب</span>}
      </header>
      <section className="sf-grade-intro">
        <span className="sf-grade-mark"><BookOpen size={30} /></span>
        <p>اختر رحلتك التعليمية</p>
        <h1>أي صف ستتعلم اليوم؟</h1>
        <span>يُحفظ تقدمك منفصلًا لكل صف ووحدة.</span>
      </section>
      <section className="sf-grade-grid" aria-label="اختيار الصف">
        {allowedGrades.includes("grade4") && <article className="sf-grade-choice sf-grade-four">
          <div className="sf-grade-choice-icon"><Sparkles size={26} /></div>
          <p>PRIMARY 4</p>
          <h2 dir="ltr">Grade 4</h2>
          <span>20 درسًا · بطاقات وصور واختبارات</span>
          <button onClick={onSelectGrade4}>ابدأ Grade 4 <ArrowLeft size={18} /></button>
        </article>}
        {allowedGrades.includes("grade5") && <article className="sf-grade-choice sf-grade-five">
          <div className="sf-grade-choice-icon"><BookOpen size={26} /></div>
          <p>PRIMARY 5</p>
          <h2 dir="ltr">Grade 5</h2>
          <span>20 درسًا · 609 مفردة وعبارة</span>
          <small>بطاقات وصور كرتونية واختبارات لكل وحدة.</small>
          <button onClick={onSelectGrade5}>ابدأ Grade 5 <ArrowLeft size={18} /></button>
        </article>}
        {allowedGrades.includes("grade6") && <article className="sf-grade-choice sf-grade-six">
          <div className="sf-grade-choice-icon"><Sparkles size={26} /></div>
          <p>PRIMARY 6</p>
          <h2 dir="ltr">Grade 6</h2>
          <span>20 درسًا · 609 مفردة وعبارة</span>
          <small>51 صورة مراجَعة حاليًا · اختبارات لكل وحدة.</small>
          <button onClick={onSelectGrade6}>ابدأ Grade 6 <ArrowLeft size={18} /></button>
        </article>}
      </section>
    </main>
  );
}
