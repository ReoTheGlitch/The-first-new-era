import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — العصر الجديد الأول" },
      { name: "description", content: "سجّل الدخول أو أنشئ حسابًا لبدء التعلم." },
      { property: "og:title", content: "تسجيل الدخول — العصر الجديد الأول" },
      { property: "og:description", content: "سجّل الدخول أو أنشئ حسابًا لبدء التعلم." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "reset") {
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/auth/reset-confirm",
      });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setResetSent(true);
      return;
    }
    if (mode === "up" && (name.trim().length < 2 || name.trim().length > 20)) {
      toast.error("الاسم المستعار من حرفين إلى 20 حرفًا");
      return;
    }
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        toast.error("بيانات الدخول غير صحيحة");
        return;
      }
      navigate({ to: "/app" });
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: window.location.origin + "/app",
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) navigate({ to: "/app" });
    else toast.success("تحقق من بريدك لتأكيد الحساب");
  }

  const input = "w-full rounded-xl border border-input bg-muted/60 px-3 py-3 text-sm";
  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <div className="ambient" aria-hidden />
      <div className="surface-card relative z-10 w-full max-w-sm space-y-5 p-6">
        <Logo />
        <h1 className="text-2xl font-semibold">
          {mode === "in" ? "تسجيل الدخول" : mode === "up" ? "إنشاء حساب" : "استعادة كلمة المرور"}
        </h1>

        {mode === "reset" && resetSent ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              أُرسل رابط استعادة كلمة المرور إلى بريدك الإلكتروني. تحقق من صندوق الوارد.
            </p>
            <button
              onClick={() => {
                setMode("in");
                setResetSent(false);
              }}
              className="w-full text-sm text-primary"
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="space-y-3">
              {mode === "up" && (
                <div className="space-y-1">
                  <input
                    type="text"
                    required
                    maxLength={20}
                    placeholder="الاسم المستعار"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={input}
                  />
                  <p className="text-xs text-muted-foreground">
                    يظهر في لوحة المتصدرين. لا تكتب اسمك الحقيقي.
                  </p>
                </div>
              )}
              <input
                type="email"
                required
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
                dir="ltr"
              />
              {mode !== "reset" && (
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="كلمة المرور (8 أحرف على الأقل)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={input}
                  dir="ltr"
                />
              )}
              <button
                disabled={busy}
                className="press w-full rounded-xl bg-brand py-3 font-medium text-primary-foreground disabled:opacity-50"
              >
                {mode === "in" ? "دخول" : mode === "up" ? "إنشاء الحساب" : "إرسال رابط الاستعادة"}
              </button>
            </form>

            {mode === "in" && (
              <button
                onClick={() => setMode("reset")}
                className="w-full text-sm text-muted-foreground hover:text-primary"
              >
                نسيت كلمة المرور؟
              </button>
            )}

            <button
              onClick={() => setMode(mode === "up" ? "in" : "up")}
              className="w-full text-sm text-primary"
            >
              {mode === "in"
                ? "ليس لديك حساب؟ أنشئ حسابًا"
                : mode === "up"
                  ? "لديك حساب؟ سجّل الدخول"
                  : "أنشئ حسابًا جديدًا"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
