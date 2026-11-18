import { cn } from "@/lib/utils";
import { MODES, modeMin, packKeyOf, type DuelMode, type Pack } from "./types";

type Props = {
  mode: DuelMode;
  onMode: (m: DuelMode) => void;
  packs: Pack[];
  packKey: string;
  onPack: (key: string) => void;
};

/** اختيار وضع المنافسة والباك (مجموعة الأسئلة): كل المادة أو فصل أو درس. */
export function ModePackPicker({ mode, onMode, packs, packKey, onPack }: Props) {
  const min = modeMin(mode);
  const groups = [...new Set(packs.map((p) => p.group))];
  const current = MODES.find((m) => m.key === mode)!;

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="وضع المنافسة" className="grid grid-cols-3 gap-2">
        {MODES.map((m) => (
          <button
            key={m.key}
            role="radio"
            aria-checked={mode === m.key}
            onClick={() => onMode(m.key)}
            className={cn(
              "rounded-md border px-2 py-3 text-sm font-medium transition-colors",
              mode === m.key
                ? "border-primary bg-primary/15"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-sm leading-7 text-muted-foreground">{current.rules}</p>

      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">الباك (الأسئلة المستخدمة)</span>
        <select
          value={packKey}
          onChange={(e) => onPack(e.target.value)}
          className="w-full rounded-md border border-input bg-muted/60 px-3 py-3 text-sm"
        >
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {packs
                .filter((p) => p.group === g)
                .map((p) => (
                  <option key={packKeyOf(p)} value={packKeyOf(p)} disabled={p.count < min}>
                    {p.title} ({p.count} سؤال){p.count < min ? " — لا يكفي لهذا الوضع" : ""}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
    </div>
  );
}
