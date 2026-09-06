import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { WhatsAppBubble } from "@/components/whatsapp-bubble";
import { clientLogout } from "@/lib/actions";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/panel" as const, hash: "bugun", label: "Bugün" },
  { to: "/panel" as const, hash: "diyet", label: "Diyet" },
  { to: "/panel/mesaj" as const, hash: "", label: "Mesaj" },
  { to: "/panel" as const, hash: "randevu", label: "Randevu" },
  { to: "/panel/profil" as const, hash: "", label: "Profil" },
];

export function ClientShell({
  children,
  name,
}: {
  children: React.ReactNode;
  name: string;
}) {
  const { pathname, hash } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, hash: s.location.hash }),
  });
  const h = hash.replace("#", "");

  function isActive(tab: (typeof TABS)[number]) {
    if (tab.to === "/panel/mesaj" || tab.to === "/panel/profil") return pathname === tab.to;
    return (
      pathname === "/panel" &&
      (tab.hash === "bugun" ? h === "" || h === "bugun" : h === tab.hash)
    );
  }

  return (
    <div className="min-h-dvh pb-8">
      <header className="sticky top-0 z-20 border-b border-line bg-cream/90 backdrop-blur-md">
        <div className="page-wrap flex items-center justify-between py-3">
          <Logo to="/panel" />
          <nav className="hidden items-center gap-1 md:flex">
            {TABS.map((tab) => (
              <Link
                key={tab.label}
                to={tab.to}
                hash={tab.hash || undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium",
                  isActive(tab) ? "bg-brand-soft text-brand-dark" : "text-muted",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{name}</span>
            <button
              type="button"
              className="text-sm font-medium text-brand"
              onClick={async () => {
                await clientLogout();
                window.location.href = "/giris";
              }}
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>
      <div className="page-wrap py-6">{children}</div>
      <WhatsAppBubble
        lift
        message={`Merhaba, ben ${name}. Danışan panelinden yazıyorum.`}
      />
    </div>
  );
}
