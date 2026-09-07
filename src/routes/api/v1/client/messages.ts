import { createFileRoute } from "@tanstack/react-router";
import { clientSendMessage } from "@/lib/actions";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { getClientIdFromCookie, isAuthError } from "@/lib/session";

export const Route = createFileRoute("/api/v1/client/messages")({
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
          const body = await readJsonBody<{ message?: string }>(request);
          const message = String(body?.message ?? "").trim();
          if (!message) {
            return jsonResponse(
              request,
              { ok: false, error: "Mesaj yazın." },
              { status: 400 },
            );
          }
          if (message.length > 4000) {
            return jsonResponse(
              request,
              { ok: false, error: "Mesaj çok uzun." },
              { status: 400 },
            );
          }
          try {
            const result = await clientSendMessage({ data: { message } });
            if (!result.ok) {
              return jsonResponse(
                request,
                { ok: false, error: "Mesaj gönderilemedi." },
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
