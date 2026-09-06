import { packageBalance, packageBalanceLine, type ClientPackage } from "@/lib/packages";

export function PackageBalanceBar({
  pkg,
  compact = false,
}: {
  pkg: Pick<ClientPackage, "title" | "total" | "next_no" | "unit">;
  compact?: boolean;
}) {
  const b = packageBalance(pkg);
  return (
    <div className={compact ? "" : "mt-2"}>
      <div className="h-2 overflow-hidden rounded-full bg-sand-deep">
        <div
          className={`h-full rounded-full ${b.done ? "bg-brand" : b.remaining === 1 ? "bg-warn" : "bg-brand"}`}
          style={{ width: `${Math.min(100, b.pct)}%` }}
        />
      </div>
      <p className={`mt-1 ${compact ? "text-xs text-muted" : "text-sm text-ink-soft"}`}>
        {packageBalanceLine(pkg)}
      </p>
    </div>
  );
}
