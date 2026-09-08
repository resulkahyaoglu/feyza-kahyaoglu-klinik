import { createFileRoute } from "@tanstack/react-router";
import {
  loadCredentials,
  updateClientLogin,
  updateStaffAccount,
} from "@/lib/actions";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { getStaffRole, isAuthError } from "@/lib/session";

export const Route = createFileRoute("/api/v1/staff/credentials/")({
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
          if (role !== "admin") {
            return jsonResponse(
              request,
              { auth: false, error: "Şifreler yalnızca yönetici için." },
              { status: 403 },
            );
          }
          const data = await loadCredentials();
          if (!data.auth) {
            return jsonResponse(
              request,
              { auth: false, error: "Şifreler yalnızca yönetici için." },
              { status: 403 },
            );
          }
          return jsonResponse(request, {
            auth: true,
            role,
            admin: data.admin,
            assistant: data.assistant,
            clients: data.clients.map((c) => ({
              id: c.id,
              full_name: c.full_name,
              phone: c.phone,
              is_active: c.is_active === 1,
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
          if (role !== "admin") {
            return jsonResponse(
              request,
              { ok: false, error: "Şifreler yalnızca yönetici için." },
              { status: 403 },
            );
          }
          const body = await readJsonBody<{
            action?: string;
            role?: "admin" | "assistant";
            username?: string;
            password?: string;
            id?: number;
            phone?: string;
          }>(request);
          const action = String(body?.action || "").trim();
          try {
            if (action === "updateStaff") {
              const staffRole = body?.role;
              if (staffRole !== "admin" && staffRole !== "assistant") {
                return jsonResponse(
                  request,
                  { ok: false, error: "Geçersiz personel rolü." },
                  { status: 400 },
                );
              }
              const res = await updateStaffAccount({
                data: {
                  role: staffRole,
                  username: String(body?.username || ""),
                  password: body?.password ? String(body.password) : undefined,
                },
              });
              if (!res.ok) {
                return jsonResponse(request, res, { status: 400 });
              }
              return jsonResponse(request, res);
            }
            if (action === "updateClient") {
              const id = Number(body?.id);
              if (!Number.isFinite(id) || id <= 0) {
                return jsonResponse(
                  request,
                  { ok: false, error: "Geçersiz danışan." },
                  { status: 400 },
                );
              }
              const res = await updateClientLogin({
                data: {
                  id,
                  phone: String(body?.phone || ""),
                  password: body?.password ? String(body.password) : undefined,
                },
              });
              if (!res.ok) {
                return jsonResponse(request, res, { status: 400 });
              }
              return jsonResponse(request, res);
            }
            return jsonResponse(
              request,
              {
                ok: false,
                error: "Geçersiz işlem. action: updateStaff | updateClient",
              },
              { status: 400 },
            );
          } catch (err) {
            if (isAuthError(err, "admin")) {
              return jsonResponse(
                request,
                { ok: false, error: "Şifreler yalnızca yönetici için." },
                { status: 403 },
              );
            }
            throw err;
          }
        }),
    },
  },
});
