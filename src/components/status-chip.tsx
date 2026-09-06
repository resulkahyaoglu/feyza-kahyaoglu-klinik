import { STATUS_LABEL, REQUEST_STATUS_LABEL } from "@/lib/clinic";
import { cn } from "@/lib/utils";

export function StatusChip({ status }: { status: string }) {
  const cls =
    status === "onaylandi" || status === "tamamlandi"
      ? "chip-ok"
      : status === "beklemede"
        ? "chip-wait"
        : status === "gelmedi"
          ? "chip-wait"
          : status === "iptal"
            ? "chip-bad"
            : "chip-off";
  return <span className={cn("chip", cls)}>{STATUS_LABEL[status] ?? status}</span>;
}

export function RequestChip({ status }: { status: string }) {
  const cls =
    status === "onaylandi"
      ? "chip-ok"
      : status === "beklemede"
        ? "chip-wait"
        : status === "reddedildi"
          ? "chip-bad"
          : "chip-off";
  return (
    <span className={cn("chip", cls)}>{REQUEST_STATUS_LABEL[status] ?? status}</span>
  );
}
