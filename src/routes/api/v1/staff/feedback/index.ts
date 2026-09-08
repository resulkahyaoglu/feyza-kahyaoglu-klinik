import { createFileRoute } from "@tanstack/react-router";
import { deleteFeedback, loadFeedbackList } from "@/lib/actions";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { getStaffRole, isAuthError } from "@/lib/session";

export const Route = createFileRoute("/api/v1/staff/feedback/")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      GET: async ({ request }) =>
        runApi(request, async () => {
          const role = getStaffRole();
          if (!role) {
            return jsonResponse(
              request,
              { auth: false, error: "Personel oturumu gerekli." },
              { status: 401 },
            );
          }
          const data = await loadFeedbackList();
          if (!data.auth) {
            return jsonResponse(
              request,
              { auth: false, error: "Personel oturumu gerekli." },
              { status: 401 },
            );
          }
          return jsonResponse(request, {
            auth: true,
            role,
            rows: data.rows.map((r) => ({
              id: r.id,
              user_id: r.user_id,
              message: r.message,
              is_read: Number(r.is_read) === 1,
              created_at: String(r.created_at).slice(0, 19),
              client_name: r.client_name,
              client_phone: r.client_phone ?? "",
            })),
          });
        }),
      POST: async ({ request }) =>
        runApi(request, async () => {
          const role = getStaffRole();
          if (!role) {
            return jsonResponse(
              request,
              { ok: false, error: "Personel oturumu gerekli." },
              { status: 401 },
            );
          }
          const body = await readJsonBody<{ id?: number; action?: string }>(request);
          const id = Number(body?.id);
          if (!Number.isFinite(id) || id <= 0) {
            return jsonResponse(
              request,
              { ok: false, error: "Geçersiz görüş kimliği." },
              { status: 400 },
            );
          }
          try {
            const res = await deleteFeedback({ data: { id } });
            return jsonResponse(request, res);
          } catch (err) {
            if (isAuthError(err, "admin")) {
              return jsonResponse(
                request,
                { ok: false, error: "Personel oturumu gerekli." },
                { status: 401 },
              );
            }
            throw err;
          }
        }),
    },
  },
});
