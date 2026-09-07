import { createFileRoute } from "@tanstack/react-router";
import { saveDailyLog } from "@/lib/actions";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { getClientIdFromCookie, isAuthError } from "@/lib/session";

const MOODS = new Set(["iyi", "normal", "yorgun", "zorlaniyorum"]);

function optInt(v: unknown, min: number, max: number): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function optNum(v: unknown, min: number, max: number): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(min, Math.min(max, n));
}

export const Route = createFileRoute("/api/v1/client/daily")({
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
            lowCarb?: boolean;
            hungerBefore?: number;
            hungerAfter?: number;
            eatTrigger?: string;
            sleepHours?: number;
            stress?: number;
            mood?: string;
            energy?: number;
          }>(request);
          if (!body) {
            return jsonResponse(
              request,
              { ok: false, error: "Geçersiz istek gövdesi." },
              { status: 400 },
            );
          }
          const sleepHours = optNum(body.sleepHours, 0, 16);
          const stress = optInt(body.stress, 1, 5);
          const energy = optInt(body.energy, 1, 5);
          const hungerBefore = optInt(body.hungerBefore, 1, 10);
          const hungerAfter = optInt(body.hungerAfter, 1, 10);
          const waterMl = optInt(body.waterMl, 0, 8000);
          const addWaterMl = optInt(body.addWaterMl, 1, 1000);
          const moodRaw = body.mood != null ? String(body.mood).trim() : "";
          const mood =
            moodRaw && MOODS.has(moodRaw)
              ? (moodRaw as "iyi" | "normal" | "yorgun" | "zorlaniyorum")
              : undefined;
          if (
            sleepHours == null &&
            stress == null &&
            energy == null &&
            hungerBefore == null &&
            hungerAfter == null &&
            waterMl == null &&
            addWaterMl == null &&
            body.sweaty === undefined &&
            body.lowCarb === undefined &&
            body.eatTrigger === undefined &&
            !mood
          ) {
            return jsonResponse(
              request,
              {
                ok: false,
                error:
                  "Uyku, stres, ruh hali veya öğün alanlarından en az biri gerekli.",
              },
              { status: 400 },
            );
          }
          try {
            const result = await saveDailyLog({
              data: {
                ...(waterMl != null ? { waterMl } : {}),
                ...(addWaterMl != null ? { addWaterMl } : {}),
                ...(body.sweaty !== undefined
                  ? { sweaty: Boolean(body.sweaty) }
                  : {}),
                ...(body.lowCarb !== undefined
                  ? { lowCarb: Boolean(body.lowCarb) }
                  : {}),
                ...(hungerBefore != null ? { hungerBefore } : {}),
                ...(hungerAfter != null ? { hungerAfter } : {}),
                ...(body.eatTrigger !== undefined
                  ? { eatTrigger: String(body.eatTrigger) }
                  : {}),
                ...(sleepHours != null ? { sleepHours } : {}),
                ...(stress != null ? { stress } : {}),
                ...(mood ? { mood } : {}),
                ...(energy != null ? { energy } : {}),
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
