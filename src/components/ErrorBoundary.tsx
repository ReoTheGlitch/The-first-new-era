import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const msg = this.state.error?.message ?? "";

    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <div className="mb-4 flex justify-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-destructive/70"
              aria-hidden="true"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">حدث خطأ غير متوقع</h2>
          <p className="mt-1 text-sm text-muted-foreground">حاول تحديث الصفحة أو العودة للرئيسية</p>
          {msg && (
            <code className="mt-4 hidden rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground md:block">
              {msg}
            </code>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="press rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              تحديث الصفحة
            </button>
            <a
              href="/app"
              className="press rounded-xl border border-input px-5 py-2.5 text-sm font-medium text-foreground"
            >
              الرئيسية
            </a>
          </div>
        </div>
      </div>
    );
  }
}
