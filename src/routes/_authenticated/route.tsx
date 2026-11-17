import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { me } from "@/features/auth/auth.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // me() answers 401 without a valid session cookie; the global middleware turns that into a
    // redirect, and anything that is not a `{ userId }` result also lands on /auth.
    let user: { userId: string } | null = null;
    try {
      const res = await me();
      if (res && typeof res === "object" && "userId" in res) user = res;
    } catch {
      user = null;
    }
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
