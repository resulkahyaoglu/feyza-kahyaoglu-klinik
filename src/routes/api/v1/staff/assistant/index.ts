import { createFileRoute } from "@tanstack/react-router";
import { decideDeleteRequest, loadAssistantDay } from "@/lib/actions";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { getStaffRole, isAuthError } from "@/lib/session";

function forbid(request: Request, role: string | null) {
  if (!role) {
    return jsonResponse(
      request,
      { auth: false, ok: false, error: "Personel oturumu gerekli." },
      { status: 401 },
    );
  }
  if (role !== "admin") {
    return jsonResponse(
      request,
      { auth: false, ok: false, error: "Asistan özeti yalnızca yönetici için." },
      { status: 403 },
    );
  }
  return null;
}

export const Route = createFileRoute("/api/v1/staff/assistant/")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      GET: async ({ request }) =>
        runApi(request, async () => {
          const role = getStaffRole();
          const blocked = forbid(request, role);
          if (blocked) return blocked;
          const data = await loadAssistantDay();
          if (!data.auth) {
            return jsonResponse(
              request,
              { auth: false, error: "Asistan özeti yalnızca yönetici için." },
              { status: 403 },
            );
          }
          return jsonResponse(request, {
            auth: true,
            role,
            firstLogin: data.firstLogin,
            lastLogout: data.lastLogout,
            loginCount: data.loginCount,
            pending: data.pending.map((r) => ({
              id: r.id,
              target_table: r.target_table,
              target_id: r.target_id,
              summary: r.summary,
              status: r.status,
              created_at: String(r.created_at).slice(0, 19),
            })),
            logs: data.logs.map((row) => ({
              id: row.id,
              kind: row.kind,
              title: row.title,
              body: row.body ?? "",
              href: row.href ?? "",
              created_at: String(row.created_at).slice(0, 19),
            })),
          });
        }),
      POST: async ({ request }) =>
        runApi(request, async () => {
          const role = getStaffRole();
          const blocked = forbid(request, role);
          if (blocked) return blocked;
          const body = await readJsonBody<{
            action?: string;
            id?: number;
            decision?: "onaylandi" | "reddedildi";
          }>(request);
          const action = String(body?.action || "decide").trim();
          if (action !== "decide") {
            return jsonResponse(
              request,
              { ok: false, error: "Geçersiz işlem. action: decide" },
              { status: 400 },
            );
          }
          const id = Number(body?.id);
          const decision = body?.decision;
          if (!Number.isFinite(id) || id <= 0) {
            return jsonResponse(
              request,
              { ok: false, error: "Geçersiz talep." },
              { status: 400 },
            );
          }
          if (decision !== "onaylandi" && decision !== "reddedildi") {
            return jsonResponse(
              request,
              { ok: false, error: "Karar: onaylandi veya reddedildi." },
              { status: 400 },
            );
          }
          try {
            const res = await decideDeleteRequest({ data: { id, decision } });
            if (!res.ok) {
              return jsonResponse(request, res, { status: 400 });
            }
            return jsonResponse(request, res);
          } catch (err) {
            if (isAuthError(err, "admin")) {
              return jsonResponse(
                request,
                { ok: false, error: "Asistan özeti yalnızca yönetici için." },
                { status: 403 },
              );
            }
            throw err;
          }
        }),
    },
  },
});
