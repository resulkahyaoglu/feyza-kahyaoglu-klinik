import { createFileRoute } from "@tanstack/react-router";
import { loadClientPanel } from "@/lib/actions";
import { jsonResponse, optionsResponse, runApi } from "@/lib/mobile-api.server";
import { getClientIdFromCookie } from "@/lib/session";

export const Route = createFileRoute("/api/v1/client/panel")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      GET: async ({ request }) =>
        runApi(request, async () => {
          if (!getClientIdFromCookie()) {
            return jsonResponse(
              request,
              { auth: false, error: "Danışan oturumu gerekli." },
              { status: 401 },
            );
          }
          const data = await loadClientPanel();
          if (!data || (data as { auth?: boolean }).auth === false) {
            return jsonResponse(
              request,
              { auth: false, error: "Danışan oturumu gerekli." },
              { status: 401 },
            );
          }
          return jsonResponse(request, data);
        }),
    },
  },
});
