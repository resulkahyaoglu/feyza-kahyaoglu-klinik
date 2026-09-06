import { createFileRoute } from "@tanstack/react-router";
import {
  apiMe,
  jsonResponse,
  optionsResponse,
} from "@/lib/mobile-api.server";

export const Route = createFileRoute("/api/v1/auth/me")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      GET: async ({ request }) => {
        const me = await apiMe();
        if (!me.role) {
          return jsonResponse(
            request,
            { ok: false, error: "Oturum bulunamadı.", ...me },
            { status: 401 },
          );
        }
        return jsonResponse(request, { ok: true, ...me });
      },
    },
  },
});
