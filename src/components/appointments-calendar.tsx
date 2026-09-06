import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDaysISO,
  formatDateTr,
  monthLabel,
  monthRange,
  shiftMonth,
  todayISO,
  weekdayTr,
} from "@/lib/clinic";
import type { AppointmentRow } from "@/lib/actions";
import { cn } from "@/lib/utils";

const HEAD = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;
const ACTIVE = new Set(["beklemede", "onaylandi"]);

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full;
}

function cellsForMonth(ym: string): string[] {
  const { from, to } = monthRange(ym);
  const [y, m] = ym.split("-").map(Number);
  const dow = new Date(Date.UTC(y, (m ?? 1) - 1, 1)).getUTCDay();
  const mondayOffset = (dow + 6) % 7;
  const start = addDaysISO(from, -mondayOffset);
  const cells = Array.from({ length: 42 }, (_, i) => addDaysISO(start, i));
  if (cells.slice(35).every((iso) => iso > to)) return cells.slice(0, 35);
  return cells;
}

export function AppointmentsCalendar({
  month,
  rows,
  selectedDay,
  onSelectDay,
  onMonthChange,
}: {
  month: string;
  rows: AppointmentRow[];
  selectedDay: string;
  onSelectDay: (iso: string) => void;
  onMonthChange: (ym: string) => void;
}) {
  const today = todayISO();
  const { from, to } = monthRange(month);
  const cells = cellsForMonth(month);
  const byDay = new Map<string, AppointmentRow[]>();
  for (const r of rows) {
    if (!ACTIVE.has(r.status)) continue;
    const k = r.appointment_date.slice(0, 10);
    const list = byDay.get(k) ?? [];
    list.push(r);
    byDay.set(k, list);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  }

  return (
    <section className="surface overflow-hidden p-3 md:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full text-brand-dark hover:bg-brand-mist"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          aria-label="Önceki ay"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display text-xl md:text-2xl">{monthLabel(month)}</h2>
          <button
            type="button"
            className="mt-0.5 text-xs font-medium text-brand"
            onClick={() => {
              onMonthChange(today.slice(0, 7));
              onSelectDay(today);
            }}
          >
            Bugüne git
          </button>
        </div>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full text-brand-dark hover:bg-brand-mist"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          aria-label="Sonraki ay"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="cal-grid">
        {HEAD.map((d) => (
          <div
            key={d}
            className="flex items-center justify-center bg-cream text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
          >
            {d}
          </div>
        ))}
        {cells.map((iso) => {
          const inMonth = iso >= from && iso <= to;
          const items = byDay.get(iso) ?? [];
          const isToday = iso === today;
          const isSelected = iso === selectedDay;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => {
                if (!inMonth) onMonthChange(iso.slice(0, 7));
                onSelectDay(iso);
              }}
              className={cn(
                "flex h-full flex-col items-start gap-0.5 overflow-hidden bg-cream p-1 text-left md:p-1.5",
                !inMonth && "bg-sand text-muted",
                isSelected && "bg-brand-soft",
                isToday && !isSelected && "ring-1 ring-inset ring-brand/40",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium md:size-7 md:text-sm",
                  isToday && "bg-brand text-cream",
                  isSelected && !isToday && "bg-brand-dark text-cream",
                )}
              >
                {Number(iso.slice(8, 10))}
              </span>
              <span className="hidden w-full min-h-0 flex-1 flex-col gap-0.5 overflow-hidden md:flex">
                {items.slice(0, 2).map((a) => (
                  <span
                    key={a.id}
                    className={cn(
                      "truncate rounded-md px-1 py-px text-[10px] font-medium leading-tight",
                      a.status === "beklemede" || a.status === "gelmedi"
                        ? "bg-warn-soft text-warn"
                        : a.status === "iptal"
                          ? "bg-sand-deep text-muted"
                          : "bg-brand-mist text-brand-dark",
                    )}
                  >
                    {a.appointment_time} {firstName(a.client_name)}
                  </span>
                ))}
                {items.length > 2 ? (
                  <span className="px-1 text-[10px] text-muted">+{items.length - 2}</span>
                ) : null}
              </span>
              <span className="mt-auto flex flex-wrap gap-0.5 md:hidden">
                {items.slice(0, 4).map((a) => (
                  <span
                    key={a.id}
                    className={cn(
                      "size-1.5 rounded-full",
                      a.status === "beklemede" || a.status === "gelmedi"
                        ? "bg-warn"
                        : a.status === "iptal"
                          ? "bg-line"
                          : "bg-brand",
                    )}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">
        {weekdayTr(selectedDay)} {formatDateTr(selectedDay)} · yeşil onaylı, sarı bekleyen
      </p>
    </section>
  );
}
