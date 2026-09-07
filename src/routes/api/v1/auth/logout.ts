import { createFileRoute } from "@tanstack/react-router";
import {
  apiLogout,
  jsonResponse,
  optionsResponse,
  runApi,
} from "@/lib/mobile-api.server";

export const Route = createFileRoute("/api/v1/auth/logout")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      POST: async ({ request }) =>
        runApi(request, async () => {
          const result = await apiLogout();
          return jsonResponse(
            request,
            { ok: true },
            { setCookies: result.setCookies },
          );
        }),
    },
  },
});
