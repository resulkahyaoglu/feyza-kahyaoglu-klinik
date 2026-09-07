import { createFileRoute } from "@tanstack/react-router";
import { uploadLab } from "@/lib/actions";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { getClientIdFromCookie, isAuthError } from "@/lib/session";

function isMultipart(request: Request): boolean {
  const ct = request.headers.get("content-type") || "";
  return ct.toLowerCase().includes("multipart/form-data");
}

export const Route = createFileRoute("/api/v1/client/labs")({
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
          try {
            let fd: FormData;
            if (isMultipart(request)) {
              fd = await request.formData();
            } else {
              const body = await readJsonBody<{
                title?: string;
                note?: string;
                fileB64?: string;
                fileName?: string;
                mime?: string;
              }>(request);
              if (!body?.fileB64?.trim()) {
                return jsonResponse(
                  request,
                  {
                    ok: false,
                    error: "PDF veya fotoğraf seçin (fileB64 veya multipart).",
                  },
                  { status: 400 },
                );
              }
              let buf: Buffer;
              try {
                buf = Buffer.from(body.fileB64.trim(), "base64");
              } catch {
                return jsonResponse(
                  request,
                  { ok: false, error: "Dosya okunamadı." },
                  { status: 400 },
                );
              }
              if (buf.length <= 0) {
                return jsonResponse(
                  request,
                  { ok: false, error: "PDF veya fotoğraf seçin." },
                  { status: 400 },
                );
              }
              fd = new FormData();
              if (body.title) fd.set("title", String(body.title));
              if (body.note) fd.set("note", String(body.note));
              const name = (body.fileName || "tahlil").trim() || "tahlil";
              const mime = (body.mime || "application/octet-stream").trim();
              const blob = new Blob([buf], { type: mime });
              fd.set("file", blob, name);
            }
            const result = await uploadLab({ data: fd });
            if (!result.ok) {
              return jsonResponse(
                request,
                { ok: false, error: result.error || "Yükleme başarısız." },
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
