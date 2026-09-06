import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, CalendarDays, ClipboardList, Download, FileHeart, KeyRound, LayoutDashboard, LogOut, MessageSquareHeart, Package, Send, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { StaffQuickBar } from "@/components/staff-quick";
import { Logo, Mark } from "@/components/logo";
import { adminLogout, getStaffSession, getUnreadNotifCount } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { StaffRole } from "@/lib/session";

const ITEMS = [
  { to: "/admin" as const, label: "Bugün", icon: LayoutDashboard },
  { to: "/admin/bildirimler" as const, label: "Bildirimler", icon: Bell },
  { to: "/admin/telegram" as const, label: "Telegram", icon: Send },
  { to: "/admin/gorusler" as const, label: "Görüşler", icon: MessageSquareHeart },
  { to: "/admin/tahliller" as const, label: "Takip", icon: FileHeart },
  { to: "/admin/paketler" as const, label: "Paketler", icon: Package },
  { to: "/admin/randevular" as const, label: "Randevular", icon: CalendarDays },
  { to: "/admin/danisanlar" as const, label: "Danışanlar", icon: Users },
  { to: "/admin/mali" as const, label: "Mali", icon: Wallet },
];

function useUnreadNotifs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [count, setCount] = useState(0);
  useEffect(() => {
    let live = true;
    void getUnreadNotifCount().then((r) => {
      if (live && r.auth) setCount(r.count);
    });
    const t = window.setInterval(() => {
      void getUnreadNotifCount().then((r) => {
        if (live && r.auth) setCount(r.count);
      });
    }, 60000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [pathname]);
  return count;
}

export function AdminShell({
  children,
  title,
  action,
}: {
  children: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const unread = useUnreadNotifs();
  const [role, setRole] = useState<StaffRole | null>(null);
  useEffect(() => {
    let live = true;
    void getStaffSession().then((r) => {
      if (live && r.auth) setRole(r.role);
    });
    return () => {
      live = false;
    };
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-sand">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-line bg-cream md:flex">
        <div className="px-4 py-5">
          <Logo to="/admin" />
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {ITEMS.map((item) => {
            const active =
              item.to === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.to);
            return item.to === "/admin/randevular" ? (
              <Link
                key={item.to}
                to="/admin/randevular"
                search={{ view: "calendar" }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-brand-soft text-brand-dark"
                    : "text-ink-soft hover:bg-brand-mist",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ) : item.to === "/admin/bildirimler" ? (
              <Link
                key={item.to}
                to="/admin/bildirimler"
                search={{ all: false }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-brand-soft text-brand-dark"
                    : "text-ink-soft hover:bg-brand-mist",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
                {unread > 0 ? (
                  <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[10px] font-semibold text-sand">
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </Link>
            ) : (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-brand-soft text-brand-dark"
                    : "text-ink-soft hover:bg-brand-mist",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
          {role === "admin" ? (
            <>
            <Link
              to="/admin/asistan"
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium",
                pathname.startsWith("/admin/asistan")
                  ? "bg-brand-soft text-brand-dark"
                  : "text-ink-soft hover:bg-brand-mist",
              )}
            >
              <ClipboardList className="size-4" />
              Asistanım bugün
            </Link>
            <Link
              to="/admin/sifreler"
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium",
                pathname.startsWith("/admin/sifreler")
                  ? "bg-brand-soft text-brand-dark"
                  : "text-ink-soft hover:bg-brand-mist",
              )}
            >
              <KeyRound className="size-4" />
              Şifrelerim
            </Link>
            <Link
              to="/admin/export"
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium",
                pathname.startsWith("/admin/export")
                  ? "bg-brand-soft text-brand-dark"
                  : "text-ink-soft hover:bg-brand-mist",
              )}
            >
              <Download className="size-4" />
              Yedek
            </Link>
            </>
          ) : null}
        </nav>
        <button
          type="button"
          className="m-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-muted hover:bg-sand-deep"
          onClick={async () => {
            await adminLogout();
            await navigate({ to: role === "assistant" ? "/asistan/giris" : "/admin/login" });
          }}
        >
          <LogOut className="size-4" />
          Çıkış
        </button>
      </aside>

      <div className="md:pl-56">
        <header className="sticky top-0 z-10 border-b border-line bg-sand/90 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Link to="/admin" className="md:hidden" aria-label="Yönetim">
                <Mark className="size-9" size={36} />
              </Link>
              <h1 className="font-display text-xl md:text-2xl">{title}</h1>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              {role === "assistant" ? (
                <span className="chip chip-off">Asistan</span>
              ) : null}
              {action}
              <StaffQuickBar />
              <Link to="/" className="hidden text-sm text-muted hover:text-ink sm:inline">
                Siteye dön
              </Link>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:hidden">
            {ITEMS.map((item) => {
              const active =
                item.to === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.to);
              return item.to === "/admin/randevular" ? (
                <Link
                  key={item.to}
                  to="/admin/randevular"
                  search={{ view: "calendar" }}
                  className={cn(
                    "chip whitespace-nowrap",
                    active ? "chip-ok" : "chip-off",
                  )}
                >
                  {item.label}
                </Link>
              ) : item.to === "/admin/bildirimler" ? (
                <Link
                  key={item.to}
                  to="/admin/bildirimler"
                  search={{ all: false }}
                  className={cn(
                    "chip whitespace-nowrap",
                    active ? "chip-ok" : "chip-off",
                  )}
                >
                  {item.label}
                  {unread > 0 ? ` ${unread}` : ""}
                </Link>
              ) : (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "chip whitespace-nowrap",
                    active ? "chip-ok" : "chip-off",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            {role === "admin" ? (
              <>
              <Link
                to="/admin/asistan"
                className={cn(
                  "chip whitespace-nowrap",
                  pathname.startsWith("/admin/asistan") ? "chip-ok" : "chip-off",
                )}
              >
                Asistanım bugün
              </Link>
              <Link
                to="/admin/sifreler"
                className={cn(
                  "chip whitespace-nowrap",
                  pathname.startsWith("/admin/sifreler") ? "chip-ok" : "chip-off",
                )}
              >
                Şifrelerim
              </Link>
              <Link
                to="/admin/export"
                className={cn(
                  "chip whitespace-nowrap",
                  pathname.startsWith("/admin/export") ? "chip-ok" : "chip-off",
                )}
              >
                Yedek
              </Link>
              </>
            ) : null}
          </nav>
        </header>
        <div className="px-4 py-6 md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}
