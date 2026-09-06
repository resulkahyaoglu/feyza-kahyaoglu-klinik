import { cn } from "@/lib/utils";

export function Botanical({
  side = "left",
  className,
}: {
  side?: "left" | "right";
  className?: string;
}) {
  const flip = side === "right";
  return (
    <svg
      viewBox="0 0 280 360"
      className={cn(
        "pointer-events-none text-brand",
        flip && "-scale-x-100",
        className,
      )}
      aria-hidden
    >
      <g fill="currentColor">
        <path d="M92 28c28 10 46 38 28 64-32-6-48 8-62 28 4-32 12-58 34-92z" opacity="0.28" />
        <path d="M148 46c24 16 28 46 4 64-26-2-40 12-52 30 10-28 22-50 48-94z" opacity="0.22" />
        <path d="M78 108c26 8 44 36 22 62-30-4-48 10-64 30 8-30 18-54 42-92z" opacity="0.32" />
        <path d="M156 122c26 14 30 48 2 66-24 0-40 14-54 32 12-28 24-52 52-98z" opacity="0.2" />
        <path d="M70 188c24 8 40 34 20 58-28-4-44 8-58 28 6-28 16-50 38-86z" opacity="0.3" />
        <path d="M148 204c24 12 28 44 2 60-22 0-38 12-50 28 10-26 22-48 48-88z" opacity="0.18" />
        <path d="M74 262c20 8 34 28 16 50-24-4-38 8-50 24 6-24 14-42 34-74z" opacity="0.24" />
      </g>
    </svg>
  );
}
