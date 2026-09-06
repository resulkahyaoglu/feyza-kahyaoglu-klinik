import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  Leaf,
  Monitor,
  Salad,
  Sparkles,
  Zap,
} from "lucide-react";
import type { ServiceKey } from "@/lib/clinic";
import { cn } from "@/lib/utils";

export const SERVICE_ICONS: Record<ServiceKey, LucideIcon> = {
  diyet: Salad,
  "online-diyet": Monitor,
  "diyet-ishape": Sparkles,
  ishape: Zap,
};

type SceneKind = "hero" | "diyet" | "online" | "combo" | "ishape" | "about" | "login";

const SCENE_ICON: Record<SceneKind, LucideIcon> = {
  hero: Leaf,
  diyet: Salad,
  online: Monitor,
  combo: Sparkles,
  ishape: Zap,
  about: ClipboardList,
  login: CalendarDays,
};

export function Scene({
  kind,
  className,
}: {
  kind: SceneKind;
  className?: string;
}) {
  const Icon = SCENE_ICON[kind];
  const dark = kind === "hero" || kind === "login";
  return (
    <div className={cn("scene", dark ? "scene-dark" : "scene-light", className)} aria-hidden>
      <svg viewBox="0 0 400 260" className="scene-svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`g-${kind}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={dark ? "#3d8c7a" : "#cfe4dc"} />
            <stop offset="100%" stopColor={dark ? "#163d36" : "#e4f0ec"} />
          </linearGradient>
        </defs>
        <rect width="400" height="260" fill={`url(#g-${kind})`} />
        <g opacity="0.45">
          <circle cx="200" cy="48" r="4" fill={dark ? "#f7fbf9" : "#237361"} />
          <circle cx="352" cy="130" r="3" fill={dark ? "#f7fbf9" : "#237361"} />
          <circle cx="200" cy="212" r="3.5" fill={dark ? "#f7fbf9" : "#237361"} />
        </g>
        <circle cx="200" cy="130" r="86" fill="none" stroke={dark ? "#f7fbf9" : "#237361"} strokeWidth="1.2" opacity="0.18" />
        <circle cx="200" cy="130" r="58" fill="none" stroke={dark ? "#f7fbf9" : "#237361"} strokeWidth="1.4" opacity="0.28" />
        <ellipse cx="200" cy="142" rx="72" ry="22" fill={dark ? "#0c2420" : "#fffdfb"} opacity="0.35" />
        <circle cx="200" cy="128" r="38" fill={dark ? "#faf9f7" : "#fffdfb"} opacity={dark ? 0.18 : 0.9} />
        {kind === "diyet" || kind === "hero" ? <Leaves dark={dark} /> : null}
        {kind === "online" ? <Notes dark={dark} /> : null}
        {kind === "ishape" || kind === "combo" ? <Bolts dark={dark} /> : null}
        {kind === "about" || kind === "login" ? <Notes dark={dark} /> : null}
      </svg>
      <span className="scene-badge">
        <Icon className="size-7" />
      </span>
    </div>
  );
}

function Leaves({ dark }: { dark: boolean }) {
  const c = dark ? "#e4f0ec" : "#163d36";
  return (
    <g fill={c}>
      <path d="M168 118c18-28 46-28 52 2-22 4-38 14-52 28-4-12-6-20 0-30z" opacity="0.85" />
      <path d="M220 108c14-18 34-12 36 10-16 2-26 10-36 22-2-10-4-18 0-32z" opacity="0.7" />
    </g>
  );
}

function Bolts({ dark }: { dark: boolean }) {
  const c = dark ? "#f7fbf9" : "#237361";
  return (
    <g fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round">
      <path d="M186 104l12 18h-14l16 28" />
      <path className="delay-2" d="M226 108l8 14h-10l12 22" opacity="0.6" />
    </g>
  );
}

function Notes({ dark }: { dark: boolean }) {
  const c = dark ? "#f7fbf9" : "#163d36";
  return (
    <g fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.7">
      <rect x="168" y="104" width="64" height="52" rx="8" />
      <path d="M180 118h40M180 130h28M180 142h34" />
    </g>
  );
}

export function IconMark({
  icon: Icon,
  className,
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <span className={cn("icon-mark", className)}>
      <Icon className="size-5" />
    </span>
  );
}

export function ServiceIcon({
  serviceKey,
  className,
}: {
  serviceKey: ServiceKey;
  className?: string;
}) {
  const Icon = SERVICE_ICONS[serviceKey];
  return <IconMark icon={Icon} className={className} />;
}

export const TRUST_ICONS = [Leaf, Activity, ClipboardList] as const;
