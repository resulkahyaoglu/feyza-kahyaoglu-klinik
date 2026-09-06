import { createFileRoute } from "@tanstack/react-router";
import {
  apiLogout,
  jsonResponse,
  optionsResponse,
} from "@/lib/mobile-api.server";

export const Route = createFileRoute("/api/v1/auth/logout")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      POST: async ({ request }) => {
        const result = await apiLogout();
        return jsonResponse(
          request,
          { ok: true },
          { setCookies: result.setCookies },
        );
      },
    },
  },
});
