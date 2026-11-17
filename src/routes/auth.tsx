import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { signIn, signUp } from "@/features/auth/auth.functions";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — The first" },
      { name: "description", content: "سجّل الدخول أو أنشئ حسابًا لبدء التعلم." },
      { property: "og:title", content: "تسجيل الدخول — The first" },
      { property: "og:description", content: "سجّل الدخول أو أنشئ حسابًا لبدء التعلم." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "up" && (name.trim().length < 2 || name.trim().length > 20)) {
      toast.error("الاسم المستعار من حرفين إلى 20 حرفًا");
      return;
    }
    setBusy(true);
    try {
      const res =
        mode === "in"
          ? await signIn({ data: { email, password } })
          : await signUp({ data: { email, password, name: name.trim() } });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      navigate({ to: "/app" });
    } catch {
      toast.error(mode === "in" ? "بيانات الدخول غير صحيحة" : "تعذّر إنشاء الحساب. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-md border border-input bg-muted/60 px-3 py-3 text-sm";
  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <div className="ambient" aria-hidden />
      <div className="surface-card relative z-10 w-full max-w-sm space-y-5 p-6">
        <Logo />
        <h1 className="text-2xl font-semibold">{mode === "in" ? "تسجيل الدخول" : "إنشاء حساب"}</h1>

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
            <button
              disabled={busy}
              className="press w-full rounded-md bg-brand py-3 font-medium text-primary-foreground disabled:opacity-50"
            >
              {mode === "in" ? "دخول" : "إنشاء الحساب"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "up" ? "in" : "up")}
            className="w-full text-sm text-primary"
          >
            {mode === "in" ? "ليس لديك حساب؟ أنشئ حسابًا" : "لديك حساب؟ سجّل الدخول"}
          </button>
        </>
      </div>
    </div>
  );
}
