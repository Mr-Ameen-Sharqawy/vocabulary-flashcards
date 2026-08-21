import { ArrowRight, KeyRound, Loader2, LogOut, MonitorSmartphone, Plus, ShieldCheck, Users } from "lucide-react";
import { FormEvent, useState } from "react";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

type TeacherPortalProps = { onBack: () => void };

export default function TeacherPortal({ onBack }: TeacherPortalProps) {
  const auth = trpc.auth.me.useQuery();
  const students = trpc.students.list.useQuery(undefined, { enabled: auth.data?.role === "admin", retry: false });
  const createStudent = trpc.students.create.useMutation({ onSuccess: () => students.refetch() });
  const resetPassword = trpc.students.resetPassword.useMutation({ onSuccess: () => students.refetch() });
  const updateDeviceLimit = trpc.students.updateDeviceLimit.useMutation({ onSuccess: () => students.refetch() });
  const resetDevices = trpc.students.resetDevices.useMutation({ onSuccess: () => students.refetch() });
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [maxDevices, setMaxDevices] = useState(1);
  const [resetStudentId, setResetStudentId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createStudent.mutate({ displayName, username, password, maxDevices }, {
      onSuccess: () => {
        setDisplayName("");
        setUsername("");
        setPassword("");
        setMaxDevices(1);
      },
    });
  }

  function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetStudentId) return;
    resetPassword.mutate({ studentId: resetStudentId, password: newPassword }, {
      onSuccess: () => {
        setResetStudentId(null);
        setNewPassword("");
      },
    });
  }

  if (auth.isLoading) return <main className="sf-access-shell"><div className="sf-access-card sf-access-loading"><Loader2 className="animate-spin" /> جارٍ التحقق من دخول المعلم...</div></main>;
  if (!auth.data) {
    return <main className="sf-access-shell" dir="rtl"><section className="sf-access-card"><div className="sf-access-mark"><ShieldCheck size={31} /></div><p className="sf-access-overline">TEACHER AREA</p><h1>بوابة المعلم</h1><p className="sf-access-copy">سجّل الدخول بحساب المعلم لإضافة حسابات الطلاب وإعادة تعيين كلمات المرور.</p><button className="sf-access-submit" onClick={startLogin}><KeyRound size={18} /> دخول المعلم</button><button className="sf-teacher-link" onClick={onBack}><ArrowRight size={16} /> العودة لدخول الطلاب</button></section></main>;
  }
  if (auth.data.role !== "admin") return <main className="sf-access-shell" dir="rtl"><section className="sf-access-card"><div className="sf-access-mark"><ShieldCheck size={31} /></div><h1>هذه الصفحة للمعلم فقط</h1><p className="sf-access-copy">الحساب الحالي لا يملك صلاحية إدارة الطلاب.</p><button className="sf-teacher-link" onClick={onBack}><ArrowRight size={16} /> العودة لدخول الطلاب</button></section></main>;

  return (
    <main className="sf-teacher-shell" dir="rtl">
      <header className="sf-teacher-header"><div><p className="sf-access-overline">TEACHER CONTROL CENTER</p><h1>إدارة حسابات الطلاب</h1><p>مرحبًا {auth.data.name ?? "معلمنا"} — أنشئ الحسابات وشارك بيانات الدخول مع كل طالب.</p></div><button className="sf-teacher-link" onClick={() => auth.refetch()}><LogOut size={16} /> تحديث الجلسة</button></header>
      <section className="sf-teacher-grid">
        <form className="sf-teacher-panel" onSubmit={addStudent}>
          <h2><Plus size={19} /> إضافة طالب</h2>
          <label>اسم الطالب<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} maxLength={120} /></label>
          <label>اسم المستخدم<input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} required pattern="[a-z0-9_]{3,32}" minLength={3} maxLength={32} dir="ltr" placeholder="student_01" /></label>
          <label>كلمة المرور الأولى<input value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} type="password" dir="ltr" /></label>
          <label>عدد الأجهزة المسموح بها<select value={maxDevices} onChange={(event) => setMaxDevices(Number(event.target.value))}>{Array.from({ length: 10 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value} جهاز/أجهزة</option>)}</select></label>
          {createStudent.error && <p className="sf-access-error">{createStudent.error.message}</p>}
          <button className="sf-access-submit" disabled={createStudent.isPending} type="submit"><Plus size={18} /> {createStudent.isPending ? "جارٍ الحفظ..." : "إنشاء الحساب"}</button>
        </form>
        <section className="sf-teacher-panel sf-student-list"><h2><Users size={19} /> الطلاب ({students.data?.length ?? 0})</h2>{students.isLoading && <p>جارٍ تحميل الحسابات...</p>}{students.data?.length === 0 && <p className="sf-muted-copy">لم تضف أي حساب بعد.</p>}{students.data?.map((student) => <article className="sf-student-row" key={student.id}><div><strong>{student.displayName}</strong><span dir="ltr">{student.username}</span><small className="sf-device-count"><MonitorSmartphone size={14} /> <span dir="ltr">{student.deviceCount} / {student.maxDevices}</span> أجهزة موثوقة</small></div><div className="sf-student-actions"><select aria-label={`Device limit for ${student.username}`} value={student.maxDevices} onChange={(event) => updateDeviceLimit.mutate({ studentId: student.id, maxDevices: Number(event.target.value) })}>{Array.from({ length: 10 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value} جهاز</option>)}</select><button onClick={() => setResetStudentId(student.id)}><KeyRound size={15} /> كلمة المرور</button><button onClick={() => { if (window.confirm(`إزالة كل الأجهزة الموثوقة لحساب ${student.displayName}؟`)) resetDevices.mutate({ studentId: student.id }); }}><MonitorSmartphone size={15} /> إعادة الأجهزة</button></div></article>)}</section>
      </section>
      {resetStudentId && <form className="sf-reset-panel" onSubmit={updatePassword}><h2>كلمة مرور جديدة</h2><input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} type="password" dir="ltr" autoFocus /><div><button className="sf-teacher-link" type="button" onClick={() => setResetStudentId(null)}>إلغاء</button><button className="sf-access-submit" disabled={resetPassword.isPending} type="submit">حفظ كلمة المرور</button></div>{resetPassword.error && <p className="sf-access-error">{resetPassword.error.message}</p>}</form>}
    </main>
  );
}
