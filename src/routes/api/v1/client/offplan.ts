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

function isMultipart(request: Request): boolean {
  const ct = request.headers.get("content-type") || "";
  return ct.toLowerCase().includes("multipart/form-data");
}

async function readOffplanBody(request: Request): Promise<{
  slot?: string;
  kind?: string;
  detail?: string;
  amount?: string;
  note?: string;
  photoB64?: string;
  photoMime?: string;
  photoName?: string;
} | null> {
  if (isMultipart(request)) {
    const fd = await request.formData();
    const slot = String(fd.get("slot") || "");
    const kind = String(fd.get("kind") || "extra");
    const detail = String(fd.get("detail") || "");
    const amount = String(fd.get("amount") || "");
    const note = String(fd.get("note") || "");
    const file = fd.get("photo") ?? fd.get("file");
    let photoB64: string | undefined;
    let photoMime: string | undefined;
    let photoName: string | undefined;
    if (file instanceof Blob && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer());
      photoB64 = buf.toString("base64");
      photoMime = file.type || "image/jpeg";
      photoName =
        file instanceof File && file.name
          ? file.name
          : String(fd.get("photoName") || "yemek.jpg");
    } else {
      const b64 = String(fd.get("photoB64") || "").trim();
      if (b64) {
        photoB64 = b64;
        photoMime = String(fd.get("photoMime") || "image/jpeg");
        photoName = String(fd.get("photoName") || "yemek.jpg");
      }
    }
    return {
      slot,
      kind,
      detail,
      amount: amount || undefined,
      note: note || undefined,
      photoB64,
      photoMime,
      photoName,
    };
  }
  return readJsonBody(request);
}

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
          const body = await readOffplanBody(request);
          if (!body) {
            return jsonResponse(
              request,
              { ok: false, error: "Geçersiz istek gövdesi." },
              { status: 400 },
            );
          }
          const slot = String(body.slot ?? "").trim();
          const kind = String(body.kind ?? "extra").trim() || "extra";
          const detail = String(body.detail ?? "").trim();
          const photoB64 = body.photoB64?.trim() || undefined;
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
          if (!detail && !photoB64) {
            return jsonResponse(
              request,
              {
                ok: false,
                error: "Kısa bir not yazın veya fotoğraf ekleyin.",
              },
              { status: 400 },
            );
          }
          try {
            const result = await saveOffplan({
              data: {
                slot: slot as "sabah" | "ogle" | "aksam" | "gece" | "ara",
                kind: kind as "extra" | "missing",
                detail: detail || undefined,
                amount: body.amount?.trim() || undefined,
                note: body.note?.trim() || undefined,
                photoB64,
                photoMime: body.photoMime?.trim() || undefined,
                photoName: body.photoName?.trim() || undefined,
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
