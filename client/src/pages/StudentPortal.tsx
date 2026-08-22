import { BookOpen, KeyRound, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { FormEvent, lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import GradeSelector from "./GradeSelector";

const Home = lazy(() => import("./Home"));

type StudentPortalProps = { onTeacherAccess: () => void };
const studentDeviceStorageKey = "primary4-flashcards-device-id";

function getStudentDeviceId() {
  const existing = window.localStorage.getItem(studentDeviceStorageKey);
  if (existing) return existing;
  const deviceId = crypto.randomUUID();
  window.localStorage.setItem(studentDeviceStorageKey, deviceId);
  return deviceId;
}

export default function StudentPortal({ onTeacherAccess }: StudentPortalProps) {
  const studentQuery = trpc.student.me.useQuery(undefined, { retry: false });
  const loginMutation = trpc.student.login.useMutation();
  const logoutMutation = trpc.student.logout.useMutation();
  const saveProgressMutation = trpc.student.saveProgress.useMutation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [trialEnded, setTrialEnded] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<"grade4" | "grade5" | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const saveProgressRef = useRef(saveProgressMutation.mutate);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);
  useEffect(() => { saveProgressRef.current = saveProgressMutation.mutate; }, [saveProgressMutation.mutate]);
  useEffect(() => {
    if (selectedGrade && studentQuery.data && !studentQuery.data.allowedGrades.includes(selectedGrade)) setSelectedGrade(null);
  }, [selectedGrade, studentQuery.data]);
  useEffect(() => {
    const trialEndsAt = studentQuery.data?.trialEndsAt;
    if (!trialEndsAt) return;
    const timeout = window.setTimeout(() => {
      setTrialEnded(true);
      logoutMutation.mutate(undefined, { onSuccess: () => studentQuery.refetch() });
    }, Math.max(0, trialEndsAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [studentQuery.data?.trialEndsAt, logoutMutation, studentQuery]);

  const handleProgressChange = useCallback((progress: { selectedLessonId?: string; lessonAnswers: Record<string, Record<string, string>>; quizScores: Record<string, number> }) => {
    if (!selectedGrade) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveProgressRef.current({
      activeGrade: selectedGrade,
      grade4: selectedGrade === "grade4" ? progress : studentQuery.data?.progress.grade4 ?? { lessonAnswers: {}, quizScores: {} },
      grade5: selectedGrade === "grade5" ? progress : studentQuery.data?.progress.grade5 ?? { lessonAnswers: {}, quizScores: {} },
    }), 700);
  }, [selectedGrade, studentQuery.data?.progress]);

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTrialEnded(false);
    loginMutation.mutate({ username, password, deviceId: getStudentDeviceId(), deviceLabel: "جهاز الطالب" }, {
      onSuccess: () => {
        setPassword("");
        setSelectedGrade(null);
        studentQuery.refetch();
      },
    });
  }

  if (studentQuery.isLoading) {
    return <main className="sf-access-shell" dir="rtl"><div className="sf-access-card sf-access-loading"><div className="sf-access-mark"><BookOpen size={27} /></div><div><p className="sf-access-overline" dir="ltr">VOCABULARY JOURNEY</p><strong>جاري تجهيز رحلة التعلم...</strong></div><Loader2 className="animate-spin" /></div></main>;
  }

  if (studentQuery.data) {
    if (selectedGrade === null) {
      return <GradeSelector studentName={studentQuery.data.displayName} allowedGrades={studentQuery.data.allowedGrades} onSelectGrade4={() => setSelectedGrade("grade4")} onSelectGrade5={() => setSelectedGrade("grade5")} onLogout={() => { setSelectedGrade(null); logoutMutation.mutate(undefined, { onSuccess: () => studentQuery.refetch() }); }} />;
    }
    return <Suspense fallback={<main className="sf-access-shell" dir="rtl"><div className="sf-access-card sf-access-loading"><Loader2 className="animate-spin" /> جاري فتح بطاقات الدرس...</div></main>}><Home
      grade={selectedGrade}
      initialProgress={studentQuery.data.progress[selectedGrade]}
      studentName={studentQuery.data.displayName}
      onProgressChange={handleProgressChange}
      onStudentLogout={() => { setSelectedGrade(null); logoutMutation.mutate(undefined, { onSuccess: () => studentQuery.refetch() }); }}
    /></Suspense>;
  }

  if (selectedGrade === null) {
    return <GradeSelector onSelectGrade4={() => setSelectedGrade("grade4")} onSelectGrade5={() => setSelectedGrade("grade5")} />;
  }

  return (
    <main className="sf-access-shell" dir="rtl">
      <section className="sf-access-card">
        <div className="sf-access-mark"><BookOpen size={31} /></div>
        <p className="sf-access-overline">{selectedGrade === "grade5" ? "PRIMARY 5" : "PRIMARY 4"} · VOCABULARY JOURNEY</p>
        <h1>مرحبًا يا بطل</h1>
        <p className="sf-access-copy">اكتب اسم المستخدم وكلمة المرور التي أعطاها لك المعلم لتبدأ وتحفظ تقدمك.</p>
        <form className="sf-access-form" onSubmit={login}>
          <label>اسم المستخدم<input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} autoComplete="username" required minLength={3} maxLength={32} dir="ltr" /></label>
          <label>كلمة المرور<input value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required minLength={8} type="password" dir="ltr" /></label>
          {trialEnded && <p className="sf-access-error">انتهت ساعة التجربة على هذا الجهاز. يمكن لطالب آخر بدء ساعة من جهاز مختلف، أو يمكن للمعلم إعادة ضبط الأجهزة.</p>}
          {loginMutation.error && <p className="sf-access-error">{loginMutation.error.message}</p>}
          <button className="sf-access-submit" disabled={loginMutation.isPending} type="submit"><LogIn size={18} /> {loginMutation.isPending ? "جارٍ الدخول..." : "ابدأ التعلم"}</button>
        </form>
        <button className="sf-teacher-link" onClick={() => setSelectedGrade(null)}>العودة لاختيار الصف</button>
        <button className="sf-teacher-link" onClick={onTeacherAccess}><ShieldCheck size={16} /> دخول المعلم لإدارة الحسابات</button>
      </section>
    </main>
  );
}
