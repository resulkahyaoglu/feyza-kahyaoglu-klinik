import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, optionsResponse, runApi } from "@/lib/mobile-api.server";
import { getStaffRole } from "@/lib/session";

export const Route = createFileRoute("/api/v1/staff/session")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      GET: async ({ request }) =>
        runApi(request, async () => {
          // Cookie/Bearer only — no db() (was 500 via getStaffSession → db).
          const role = getStaffRole();
          if (!role) {
            return jsonResponse(
              request,
              { auth: false, error: "Personel oturumu gerekli." },
              { status: 401 },
            );
          }
          return jsonResponse(request, { auth: true, role });
        }),
    },
  },
});
