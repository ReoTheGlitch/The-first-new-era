import { useMemo, useState } from "react";
import { LABS } from "./lab-engine";

type Lab = (typeof LABS)[string];

/** رسم تفاعلي لدرس: منزلقات تغيّر الدائرة والقراءات لحظيًا. */
export function LessonLab({ id }: { id: string }) {
  const lab = LABS[id];
  if (!lab) return null;
  return <LabView lab={lab} />;
}

function LabView({ lab }: { lab: Lab }) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(lab.c.map((c: (string | number)[]) => [String(c[0]), Number(c[5])])),
  );
  const [showSteps, setShowSteps] = useState(true);
  const result = useMemo(() => lab.f(values), [lab, values]);

  return (
    <div className="lab space-y-4">
      <div className="lab-stage rounded-lg border border-border p-3 sm:p-4">
        {/* الرسم مبني من أرقام فقط، ولا يدخل فيه نص من المستخدم */}
        <div dangerouslySetInnerHTML={{ __html: result.g }} />
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-3">
          {result.o.map((o: [string, string | number, string]) => (
            <div key={o[0]} className="text-xs text-muted-foreground">
              {o[0]}
              <b className="block text-lg font-semibold text-foreground" dir="ltr">
                {o[1]} {o[2]}
              </b>
            </div>
          ))}
        </div>
        {showSteps && (
          <p
            className="mt-2 text-xs text-muted-foreground"
            dir="ltr"
            style={{ unicodeBidi: "plaintext", textAlign: "left" }}
          >
            {result.s}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {lab.c.map((c: [string, string, number, number, number, number]) => (
          <label key={c[0]} className="block text-sm">
            {c[1]}: <b className="text-primary">{values[c[0]]}</b>
            <input
              type="range"
              className="mt-1 w-full accent-[var(--primary)]"
              min={c[2]}
              max={c[3]}
              step={c[4]}
              value={values[c[0]]}
              onChange={(e) => setValues((v) => ({ ...v, [c[0]]: +e.target.value }))}
            />
          </label>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={showSteps}
          onChange={(e) => setShowSteps(e.target.checked)}
        />
        إظهار خطوات الحل
      </label>
      {lab.t && <p className="text-sm text-muted-foreground">{lab.t}</p>}
    </div>
  );
}
