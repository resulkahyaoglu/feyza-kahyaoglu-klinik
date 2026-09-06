import { createFileRoute, redirect } from "@tanstack/react-router";
import { clientLogout } from "@/lib/actions";

export const Route = createFileRoute("/cikis")({
  loader: async () => {
    await clientLogout();
    throw redirect({ to: "/giris" });
  },
  component: () => null,
});
