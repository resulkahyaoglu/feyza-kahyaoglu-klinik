import { createFileRoute } from "@tanstack/react-router";
import { clientChangePassword } from "@/lib/actions";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { getClientIdFromCookie, isAuthError } from "@/lib/session";

export const Route = createFileRoute("/api/v1/client/password")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      POST: async ({ request }) =>
        runApi(request, async () => {
          if (!getClientIdFromCookie()) {
            return jsonResponse(
              request,
              { ok: false, error: "Danışan oturumu gerekli." },
              { status: 401 },
            );
          }
          const body = await readJsonBody<{
            current?: string;
            next?: string;
            again?: string;
          }>(request);
          if (!body) {
            return jsonResponse(
              request,
              { ok: false, error: "Geçersiz istek gövdesi." },
              { status: 400 },
            );
          }
          const current = String(body.current ?? "");
          const next = String(body.next ?? "");
          const again =
            body.again != null ? String(body.again) : undefined;
          if (again != null && next !== again) {
            return jsonResponse(
              request,
              { ok: false, error: "Yeni şifreler eşleşmiyor." },
              { status: 400 },
            );
          }
          if (!current || !next) {
            return jsonResponse(
              request,
              { ok: false, error: "Mevcut ve yeni şifre gerekli." },
              { status: 400 },
            );
          }
          try {
            const result = await clientChangePassword({
              data: { current, next },
            });
            if (!result.ok) {
              return jsonResponse(
                request,
                { ok: false, error: result.error || "Şifre güncellenemedi." },
                { status: 400 },
              );
            }
            return jsonResponse(request, { ok: true });
          } catch (err) {
            if (isAuthError(err, "client")) {
              return jsonResponse(
                request,
                { ok: false, error: "Danışan oturumu gerekli." },
                { status: 401 },
              );
            }
            throw err;
          }
        }),
    },
  },
});
