import { createFileRoute } from "@tanstack/react-router";
import { saveOffplan } from "@/lib/actions";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { getClientIdFromCookie, isAuthError } from "@/lib/session";

const SLOTS = new Set(["sabah", "ogle", "aksam", "gece", "ara"]);
const KINDS = new Set(["extra", "missing"]);

export const Route = createFileRoute("/api/v1/client/offplan")({
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
            kind?: string;
            detail?: string;
            amount?: string;
            note?: string;
          }>(request);
          const slot = String(body?.slot ?? "").trim();
          const kind = String(body?.kind ?? "extra").trim() || "extra";
          const detail = String(body?.detail ?? "").trim();
          if (!SLOTS.has(slot)) {
            return jsonResponse(
              request,
              {
                ok: false,
                error: "Öğün zamanı seçin (sabah/ogle/aksam/gece/ara).",
              },
              { status: 400 },
            );
          }
          if (!KINDS.has(kind)) {
            return jsonResponse(
              request,
              { ok: false, error: "Geçersiz kayıt türü." },
              { status: 400 },
            );
          }
          if (!detail) {
            return jsonResponse(
              request,
              { ok: false, error: "Kısa bir not yazın." },
              { status: 400 },
            );
          }
          try {
            const result = await saveOffplan({
              data: {
                slot: slot as "sabah" | "ogle" | "aksam" | "gece" | "ara",
                kind: kind as "extra" | "missing",
                detail,
                amount: body?.amount?.trim() || undefined,
                note: body?.note?.trim() || undefined,
              },
            });
            if (!result.ok) {
              return jsonResponse(
                request,
                { ok: false, error: result.error || "Kaydedilemedi." },
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
