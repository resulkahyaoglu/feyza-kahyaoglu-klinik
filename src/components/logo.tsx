import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type LogoTo = "/" | "/admin" | "/panel";

export function Mark({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <img
      src="/logo-mark.png"
      alt=""
      width={size}
      height={size}
      decoding="async"
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

export function Logo({
  inverted = false,
  compact = false,
  to = "/",
}: {
  inverted?: boolean;
  compact?: boolean;
  to?: LogoTo;
}) {
  return (
    <Link to={to} className="flex min-w-0 shrink items-center gap-2.5">
      <Mark className={compact ? "size-9" : "size-9 md:size-10"} size={compact ? 36 : 40} />
      {compact ? (
        <span className="sr-only">Feyza Kahyaoğlu</span>
      ) : (
        <span className="min-w-0 leading-tight">
          <span
            className={cn(
              "block truncate font-display text-[0.95rem] font-semibold tracking-tight md:text-[1.05rem]",
              inverted ? "text-sand" : "text-ink",
            )}
          >
            Feyza Kahyaoğlu
          </span>
          <span
            className={cn(
              "block text-[0.62rem] font-medium uppercase tracking-[0.16em] md:text-[0.68rem]",
              inverted ? "text-brand-soft" : "text-muted",
            )}
          >
            Diyetisyen
          </span>
        </span>
      )}
    </Link>
  );
}
