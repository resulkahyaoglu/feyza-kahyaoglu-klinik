import { createFileRoute } from "@tanstack/react-router";
import {
  apiClientLogin,
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";

export const Route = createFileRoute("/api/v1/auth/client/login")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      POST: async ({ request }) =>
        runApi(request, async () => {
          const body = await readJsonBody<{ phone?: string; password?: string }>(
            request,
          );
          const phone = String(body?.phone ?? "").trim();
          const password = String(body?.password ?? "");
          if (!phone || !password) {
            return jsonResponse(
              request,
              { ok: false, error: "Telefon ve şifre gerekli." },
              { status: 400 },
            );
          }
          const result = await apiClientLogin(phone, password);
          if (!result.ok) {
            return jsonResponse(
              request,
              { ok: false, error: result.error },
              { status: result.httpStatus ?? 401 },
            );
          }
          return jsonResponse(
            request,
            {
              ok: true,
              token: result.token,
              role: result.role,
              name: result.name,
            },
            { setCookies: result.setCookies },
          );
        }),
    },
  },
});
