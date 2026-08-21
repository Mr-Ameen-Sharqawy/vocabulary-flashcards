/**
 * Design context: A calm, focused grade gateway lets students choose their learning path without mixing course content.
 */
import { ArrowLeft, BookOpen, Clock3, LogOut, Sparkles } from "lucide-react";

type GradeSelectorProps = {
  studentName?: string;
  onSelectGrade4: () => void;
  onLogout?: () => void;
};

export default function GradeSelector({ studentName, onSelectGrade4, onLogout }: GradeSelectorProps) {
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
        <article className="sf-grade-choice sf-grade-four">
          <div className="sf-grade-choice-icon"><Sparkles size={26} /></div>
          <p>PRIMARY 4</p>
          <h2 dir="ltr">Grade 4</h2>
          <span>20 درسًا · بطاقات وصور واختبارات</span>
          <button onClick={onSelectGrade4}>ابدأ Grade 4 <ArrowLeft size={18} /></button>
        </article>
        <article className="sf-grade-choice sf-grade-five" aria-disabled="true">
          <div className="sf-grade-choice-icon"><Clock3 size={26} /></div>
          <p>PRIMARY 5</p>
          <h2 dir="ltr">Grade 5</h2>
          <span>20 درسًا · 609 مفردة وعبارة</span>
          <small>تجهيز الصور الكرتونية جاري قبل فتح الدروس.</small>
        </article>
      </section>
    </main>
  );
}
