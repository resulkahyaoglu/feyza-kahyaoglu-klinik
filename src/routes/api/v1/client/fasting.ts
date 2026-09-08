import { createFileRoute } from "@tanstack/react-router";
import { clientLogFasting } from "@/lib/actions";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { getClientIdFromCookie, isAuthError } from "@/lib/session";

const KINDS = new Set(["broke", "opened", "undo"]);

function optInt(v: unknown, min: number, max: number): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export const Route = createFileRoute("/api/v1/client/fasting")({
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
            kind?: string;
            reason?: string;
            detail?: string;
            energy?: number;
            dizzy?: boolean;
            endReason?: string;
          }>(request);
          const kind = String(body?.kind || "").trim();
          if (!KINDS.has(kind)) {
            return jsonResponse(
              request,
              {
                ok: false,
                error: "Geçersiz kayıt. kind: broke | opened | undo",
              },
              { status: 400 },
            );
          }
          try {
            const result = await clientLogFasting({
              data: {
                kind: kind as "broke" | "opened" | "undo",
                ...(body?.reason !== undefined
                  ? { reason: String(body.reason) }
                  : {}),
                ...(body?.detail !== undefined
                  ? { detail: String(body.detail) }
                  : {}),
                ...(optInt(body?.energy, 1, 5) != null
                  ? { energy: optInt(body?.energy, 1, 5) }
                  : {}),
                ...(body?.dizzy !== undefined
                  ? { dizzy: Boolean(body.dizzy) }
                  : {}),
                ...(body?.endReason !== undefined
                  ? { endReason: String(body.endReason) }
                  : {}),
              },
            });
            return jsonResponse(request, result);
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
