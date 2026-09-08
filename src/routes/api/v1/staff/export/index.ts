import { createFileRoute } from "@tanstack/react-router";
import {
  downloadClinicBackup,
  exportAllClinicData,
  exportAppointments,
  loadBackupStatus,
  runClinicBackupNow,
} from "@/lib/actions";
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
      { auth: false, ok: false, error: "Yedek yalnızca yönetici için." },
      { status: 403 },
    );
  }
  return null;
}

export const Route = createFileRoute("/api/v1/staff/export/")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      GET: async ({ request }) =>
        runApi(request, async () => {
          const role = getStaffRole();
          const blocked = forbid(request, role);
          if (blocked) return blocked;
          const data = await loadBackupStatus();
          if (!data.auth) {
            return jsonResponse(
              request,
              { auth: false, error: "Yedek yalnızca yönetici için." },
              { status: 403 },
            );
          }
          return jsonResponse(request, {
            auth: true,
            role,
            items: data.items,
            last: data.last,
            dbName: data.dbName,
            dbSize: data.dbSize,
            tables: data.tables,
          });
        }),
      POST: async ({ request }) =>
        runApi(request, async () => {
          const role = getStaffRole();
          const blocked = forbid(request, role);
          if (blocked) return blocked;
          const body = await readJsonBody<{ action?: string; name?: string }>(
            request,
          );
          const action = String(body?.action || "").trim();
          try {
            if (action === "backupNow") {
              const res = await runClinicBackupNow();
              if (!res.ok) {
                return jsonResponse(request, res, { status: 400 });
              }
              return jsonResponse(request, res);
            }
            if (action === "downloadBackup") {
              const name = String(body?.name || "").trim();
              if (!name) {
                return jsonResponse(
                  request,
                  { ok: false, error: "Yedek adı gerekli." },
                  { status: 400 },
                );
              }
              const res = await downloadClinicBackup({ data: { name } });
              if (!res.ok) {
                return jsonResponse(request, res, { status: 404 });
              }
              return jsonResponse(request, res);
            }
            if (action === "excelAll") {
              const file = await exportAllClinicData();
              return jsonResponse(request, { ok: true, ...file });
            }
            if (action === "excelAppts") {
              const file = await exportAppointments();
              return jsonResponse(request, { ok: true, ...file });
            }
            return jsonResponse(
              request,
              {
                ok: false,
                error:
                  "Geçersiz işlem. action: backupNow | downloadBackup | excelAll | excelAppts",
              },
              { status: 400 },
            );
          } catch (err) {
            if (isAuthError(err, "admin")) {
              return jsonResponse(
                request,
                { ok: false, error: "Yedek yalnızca yönetici için." },
                { status: 403 },
              );
            }
            throw err;
          }
        }),
    },
  },
});
