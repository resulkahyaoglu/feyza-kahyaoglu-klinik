import { createFileRoute } from "@tanstack/react-router";
import { getStaffSession } from "@/lib/actions";
import { jsonResponse, optionsResponse } from "@/lib/mobile-api.server";

export const Route = createFileRoute("/api/v1/staff/session")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      GET: async ({ request }) => {
        const data = await getStaffSession();
        if (!data || (data as { auth?: boolean }).auth === false) {
          return jsonResponse(
            request,
            { auth: false, error: "Personel oturumu gerekli." },
            { status: 401 },
          );
        }
        return jsonResponse(request, data);
      },
    },
  },
});
