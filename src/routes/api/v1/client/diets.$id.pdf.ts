import { createFileRoute } from "@tanstack/react-router";
import { getDietPdfFile } from "@/lib/actions";
import {
  binaryResponse,
  jsonResponse,
  optionsResponse,
  runApi,
} from "@/lib/mobile-api.server";
import { db, getClientIdFromCookie, isAuthError } from "@/lib/session";

export const Route = createFileRoute("/api/v1/client/diets/$id/pdf")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      GET: async ({ request, params }) =>
        runApi(request, async () => {
          if (!getClientIdFromCookie()) {
            return jsonResponse(
              request,
              { ok: false, error: "Danışan oturumu gerekli." },
              { status: 401 },
            );
          }
          const id = Number(params.id);
          if (!Number.isFinite(id) || id <= 0) {
            return jsonResponse(
              request,
              { ok: false, error: "Geçersiz diyet listesi." },
              { status: 400 },
            );
          }

          try {
            const file = await getDietPdfFile({ data: { id } });
            if (file.ok && file.b64) {
              const bytes = Buffer.from(file.b64, "base64");
              return binaryResponse(request, bytes, {
                contentType: "application/pdf",
                filename: file.filename || "diyet-listesi.pdf",
                disposition: "inline",
              });
            }
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

          // Clear 404 when diet exists but PDF blob/path is missing (name-only).
          const clientId = getClientIdFromCookie()!;
          const sql = await db();
          const rows = await sql<{
            id: number;
            pdf_name: string | null;
            title: string;
          }>`
            select id, pdf_name, title from diet_lists
            where id = ${id} and user_id = ${clientId}
            limit 1
          `;
          if (!rows[0]) {
            return jsonResponse(
              request,
              { ok: false, error: "Diyet listesi bulunamadı." },
              { status: 404 },
            );
          }
          return jsonResponse(
            request,
            {
              ok: false,
              error:
                rows[0].pdf_name
                  ? `PDF dosyası sunucuda yok (${rows[0].pdf_name}). Diyetisyeniniz yeniden yüklemeli.`
                  : "Bu diyet listesinde indirilebilir PDF yok.",
              pdf_name: rows[0].pdf_name,
              title: rows[0].title,
            },
            { status: 404 },
          );
        }),
    },
  },
});
