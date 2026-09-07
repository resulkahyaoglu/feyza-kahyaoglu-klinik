import { createFileRoute } from "@tanstack/react-router";
import { saveDailyLog } from "@/lib/actions";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { getClientIdFromCookie, isAuthError } from "@/lib/session";

export const Route = createFileRoute("/api/v1/client/water")({
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
            waterMl?: number;
            addWaterMl?: number;
            sweaty?: boolean;
          }>(request);
          if (!body) {
            return jsonResponse(
              request,
              { ok: false, error: "Geçersiz istek gövdesi." },
              { status: 400 },
            );
          }
          const waterMl =
            body.waterMl != null ? Number(body.waterMl) : undefined;
          const addWaterMl =
            body.addWaterMl != null ? Number(body.addWaterMl) : undefined;
          if (
            waterMl == null &&
            addWaterMl == null &&
            body.sweaty === undefined
          ) {
            return jsonResponse(
              request,
              { ok: false, error: "Su miktarı veya terleme bilgisi gerekli." },
              { status: 400 },
            );
          }
          try {
            const result = await saveDailyLog({
              data: {
                ...(waterMl != null && Number.isFinite(waterMl)
                  ? { waterMl: Math.max(0, Math.min(8000, Math.round(waterMl))) }
                  : {}),
                ...(addWaterMl != null && Number.isFinite(addWaterMl)
                  ? {
                      addWaterMl: Math.max(
                        1,
                        Math.min(1000, Math.round(addWaterMl)),
                      ),
                    }
                  : {}),
                ...(body.sweaty !== undefined
                  ? { sweaty: Boolean(body.sweaty) }
                  : {}),
              },
            });
            return jsonResponse(request, {
              ok: true,
              waterMl: result.waterMl,
            });
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
