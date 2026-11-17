import { useEffect, useRef, useState } from "react";

interface Props {
  lessonId: string;
  lessonTitle: string;
}

export function LessonNotes({ lessonId }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const storageKey = `lesson_notes_${lessonId}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setText(stored);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 80), 300)}px`;
  }, [text, open]);

  function save() {
    try {
      localStorage.setItem(storageKey, text);
    } catch {
      /* ignore */
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        aria-expanded={open}
      >
        <span>📝 ملاحظاتي</span>
        <span
          className="text-muted-foreground transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            placeholder="اكتب ملاحظاتك هنا..."
            className="w-full resize-none rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary/60"
            style={{ minHeight: 80, maxHeight: 300 }}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{text.length} / 1000</span>
            <button
              type="button"
              onClick={save}
              className="press rounded-xl bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              {saved ? "✓ تم الحفظ" : "حفظ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
