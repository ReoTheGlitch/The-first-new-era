import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { changePassword } from "@/features/auth/auth.functions";
import { saveSettings } from "@/features/student/student.functions";
import { studentOverviewQuery } from "@/features/student/queries";
import { Card, PageHeader } from "@/components/common";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — The first" },
      { name: "description", content: "الحساب وتفضيلات التعلم والخصوصية." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(studentOverviewQuery),
  component: Settings,
});

function Row({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="h-5 w-9 shadow-none data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted [&>span]:size-4 [&>span]:shadow-none"
      />
    </label>
  );
}

function Settings() {
  const { data: me } = useSuspenseQuery(studentOverviewQuery);
  const qc = useQueryClient();
  const p = me.prefs;
  const [name, setName] = useState(me.displayName);
  const [prefs, setPrefs] = useState({
    explanation_style: p?.explanation_style ?? "balanced",
    explanation_length: p?.explanation_length ?? "detailed",
    daily_goal_xp: p?.daily_goal_xp ?? 50,
    reduce_motion: p?.reduce_motion ?? false,
    large_text: p?.large_text ?? false,
    notify_streak: p?.notify_streak ?? true,
    notify_revision: p?.notify_revision ?? true,
    show_on_leaderboard: p?.show_on_leaderboard ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof prefs>(k: K, v: (typeof prefs)[K]) =>
    setPrefs((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", prefs.reduce_motion);
    document.documentElement.style.fontSize = prefs.large_text ? "112.5%" : "";
  }, [prefs.reduce_motion, prefs.large_text]);

  async function save() {
    const trimmed = name.trim().slice(0, 40);
    if (!trimmed) {
      toast.error("الاسم مطلوب");
      return;
    }
    setSaving(true);
    try {
      await saveSettings({ data: { displayName: trimmed, prefs } });
    } catch {
      setSaving(false);
      toast.error("تعذّر حفظ الإعدادات");
      return;
    }
    setSaving(false);
    toast.success("تم حفظ الإعدادات");
    qc.invalidateQueries({ queryKey: ["student"] });
  }

  const select = "w-full rounded-md border border-input bg-muted/60 px-3 py-2.5 text-sm";
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="الإعدادات" icon="settings" />
      <Card>
        <h2 className="mb-3 font-semibold">الحساب</h2>
        <label className="block text-sm">
          الاسم الظاهر
          <input
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            className={`${select} mt-1`}
          />
        </label>
        <p className="mt-2 text-xs text-muted-foreground">البريد: {me.email}</p>
      </Card>
      <Card className="space-y-4">
        <h2 className="font-semibold">تفضيلات التعلم</h2>
        <label className="block text-sm">
          أسلوب الشرح المفضّل
          <select
            value={prefs.explanation_style}
            onChange={(e) => set("explanation_style", e.target.value)}
            className={`${select} mt-1`}
          >
            <option value="balanced">متوازن</option>
            <option value="simple">مبسّط</option>
            <option value="examples">بالأمثلة</option>
            <option value="socratic">بالأسئلة</option>
          </select>
        </label>
        <label className="block text-sm">
          طول الشرح
          <select
            value={prefs.explanation_length}
            onChange={(e) => set("explanation_length", e.target.value)}
            className={`${select} mt-1`}
          >
            <option value="concise">مختصر</option>
            <option value="detailed">مفصّل</option>
          </select>
        </label>
        <label className="block text-sm">
          هدف اليوم (نقاط خبرة)
          <input
            type="number"
            min={10}
            max={500}
            step={10}
            value={prefs.daily_goal_xp}
            onChange={(e) =>
              set("daily_goal_xp", Math.min(500, Math.max(10, Number(e.target.value) || 10)))
            }
            className={`${select} mt-1`}
          />
        </label>
      </Card>
      <Card className="divide-y divide-border">
        <h2 className="pb-2 font-semibold">سهولة الاستخدام</h2>
        <Row
          label="تقليل الحركة"
          hint="إيقاف الحركات والتأثيرات"
          checked={prefs.reduce_motion}
          onChange={(v) => set("reduce_motion", v)}
        />
        <Row label="نص أكبر" checked={prefs.large_text} onChange={(v) => set("large_text", v)} />
      </Card>
      <Card className="divide-y divide-border">
        <h2 className="pb-2 font-semibold">الإشعارات</h2>
        <p className="py-2 text-xs text-muted-foreground">
          تُحفظ تفضيلاتك الآن؛ إرسال الإشعارات نفسه لم يُفعّل بعد.
        </p>
        <Row
          label="تذكير سلسلة التعلم"
          checked={prefs.notify_streak}
          onChange={(v) => set("notify_streak", v)}
        />
        <Row
          label="تذكير المراجعة"
          checked={prefs.notify_revision}
          onChange={(v) => set("notify_revision", v)}
        />
      </Card>
      <Card className="divide-y divide-border">
        <h2 className="pb-2 font-semibold">الخصوصية</h2>
        <Row
          label="الظهور في لوحة الترتيب"
          hint="يظهر اسمك ونقاطك فقط"
          checked={prefs.show_on_leaderboard}
          onChange={(v) => set("show_on_leaderboard", v)}
        />
      </Card>
      <button
        onClick={save}
        disabled={saving}
        className="press w-full rounded-lg bg-brand px-6 py-3 font-medium text-primary-foreground disabled:opacity-50 sm:w-auto"
      >
        {saving ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
      </button>
      <PasswordChange />
    </div>
  );
}

function PasswordChange() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("كلمة المرور الجديدة ٨ أحرف على الأقل.");
      return;
    }
    if (next !== confirm) {
      toast.error("التأكيد لا يطابق كلمة المرور الجديدة.");
      return;
    }
    setBusy(true);
    try {
      const res = await changePassword({
        data: { currentPassword: current, newPassword: next },
      });
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success("تم تغيير كلمة المرور.");
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    } catch {
      toast.error("تعذّر تغيير كلمة المرور. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary/60";

  return (
    <form className="surface-card mt-6 space-y-4 p-4" onSubmit={submit}>
      <div>
        <h2 className="font-semibold">تغيير كلمة المرور</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          سيتم تسجيل خروجك من الأجهزة الأخرى بعد التغيير.
        </p>
      </div>
      <div className="space-y-3">
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">كلمة المرور الحالية</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">كلمة المرور الجديدة</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">تأكيد كلمة المرور الجديدة</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="press w-full rounded-md border border-input px-5 py-2.5 text-sm font-medium disabled:opacity-50 sm:w-auto"
      >
        {busy ? "جارٍ التحديث…" : "تحديث كلمة المرور"}
      </button>
    </form>
  );
}
