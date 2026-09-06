import { createFileRoute } from "@tanstack/react-router";
import {
  apiStaffLogin,
  jsonResponse,
  optionsResponse,
  readJsonBody,
} from "@/lib/mobile-api.server";

export const Route = createFileRoute("/api/v1/auth/admin/login")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      POST: async ({ request }) => {
        const body = await readJsonBody<{
          username?: string;
          password?: string;
        }>(request);
        const username = String(body?.username ?? "").trim();
        const password = String(body?.password ?? "");
        if (!username || !password) {
          return jsonResponse(
            request,
            { ok: false, error: "Kullanıcı adı ve şifre gerekli." },
            { status: 400 },
          );
        }
        const result = await apiStaffLogin("admin", username, password);
        if (!result.ok) {
          return jsonResponse(request, result, { status: 401 });
        }
        return jsonResponse(
          request,
          { ok: true, token: result.token, role: result.role },
          { setCookies: result.setCookies },
        );
      },
    },
  },
});
