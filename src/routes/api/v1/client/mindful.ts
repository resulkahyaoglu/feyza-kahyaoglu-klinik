import { createFileRoute } from "@tanstack/react-router";
import { saveMindfulMeal } from "@/lib/actions";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { getClientIdFromCookie, isAuthError } from "@/lib/session";

const SLOTS = new Set(["sabah", "ogle", "aksam", "ara"]);

export const Route = createFileRoute("/api/v1/client/mindful")({
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
            slot?: string;
            hungerBefore?: number;
            hungerAfter?: number;
            eatTrigger?: string;
          }>(request);
          if (!body) {
            return jsonResponse(
              request,
              { ok: false, error: "Geçersiz istek gövdesi." },
              { status: 400 },
            );
          }
          const slot = String(body.slot ?? "").trim();
          const hungerBefore = Number(body.hungerBefore);
          const hungerAfter =
            body.hungerAfter != null ? Number(body.hungerAfter) : undefined;
          if (!SLOTS.has(slot)) {
            return jsonResponse(
              request,
              {
                ok: false,
                error: "Öğün seçin (sabah/ogle/aksam/ara).",
              },
              { status: 400 },
            );
          }
          if (
            !Number.isFinite(hungerBefore) ||
            hungerBefore < 1 ||
            hungerBefore > 10
          ) {
            return jsonResponse(
              request,
              { ok: false, error: "Yemeden önce açlık 1–10 olmalı." },
              { status: 400 },
            );
          }
          if (
            hungerAfter != null &&
            (!Number.isFinite(hungerAfter) ||
              hungerAfter < 1 ||
              hungerAfter > 10)
          ) {
            return jsonResponse(
              request,
              { ok: false, error: "Yedikten sonra tokluk 1–10 olmalı." },
              { status: 400 },
            );
          }
          try {
            await saveMindfulMeal({
              data: {
                slot: slot as "sabah" | "ogle" | "aksam" | "ara",
                hungerBefore: Math.round(hungerBefore),
                ...(hungerAfter != null
                  ? { hungerAfter: Math.round(hungerAfter) }
                  : {}),
                ...(body.eatTrigger != null
                  ? { eatTrigger: String(body.eatTrigger) }
                  : {}),
              },
            });
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
