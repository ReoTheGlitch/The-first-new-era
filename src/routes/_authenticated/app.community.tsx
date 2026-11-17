import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatusBadge } from "@/components/common";

export const Route = createFileRoute("/_authenticated/app/community")({
  head: () => ({
    meta: [
      { title: "المجتمع — The first" },
      { name: "description", content: "مساحات نقاش تعليمية — قريبًا." },
    ],
  }),
  component: Community,
});

function Community() {
  return (
    <div>
      <PageHeader title="المجتمع" icon="community" actions={<StatusBadge tone="soon" />} />
      <p className="mt-6 max-w-prose text-sm text-muted-foreground">
        قبل تفعيل النشر، نضع أدوات الإشراف والإبلاغ وحماية الخصوصية.
      </p>
    </div>
  );
}
