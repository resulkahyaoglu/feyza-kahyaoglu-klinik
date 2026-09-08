import { createFileRoute } from "@tanstack/react-router";
import {
  confirmTelegramLink,
  loadTelegramSettings,
  saveTelegramToken,
  sendTelegramTest,
  startTelegramLink,
  unlinkTelegram,
} from "@/lib/actions";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { getStaffRole, isAuthError } from "@/lib/session";

export const Route = createFileRoute("/api/v1/staff/telegram/")({
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
          const data = await loadTelegramSettings();
          if (!data.auth) {
            return jsonResponse(
              request,
              { auth: false, error: "Personel oturumu gerekli." },
              { status: 401 },
            );
          }
          // Never expose raw bot token — only masked + flags.
          return jsonResponse(request, {
            auth: true,
            role: data.role,
            hasToken: data.hasToken,
            botUsername: data.botUsername,
            maskedToken: data.maskedToken,
            linked: data.linked,
            telegramName: data.telegramName,
            pendingCode: data.pendingCode,
            admin2: data.admin2,
            // cronKey only for admin (already gated in action)
            cronKey: data.cronKey || "",
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
          const body = await readJsonBody<{
            action?: string;
            token?: string;
            slot?: number;
          }>(request);
          const action = String(body?.action || "").trim();
          const slotRaw = body?.slot === 2 ? 2 : 1;
          const slot = slotRaw as 1 | 2;

          try {
            if (action === "saveToken") {
              if (role !== "admin") {
                return jsonResponse(
                  request,
                  { ok: false, error: "Bot tokenini yalnızca yönetici kaydeder." },
                  { status: 403 },
                );
              }
              const token = String(body?.token || "");
              // Do not log token.
              const res = await saveTelegramToken({ data: { token } });
              if (!res.ok) {
                return jsonResponse(request, res, { status: 400 });
              }
              return jsonResponse(request, res);
            }
            if (action === "startLink") {
              const res = await startTelegramLink({ data: { slot } });
              if (!res.ok) {
                return jsonResponse(request, res, { status: 400 });
              }
              return jsonResponse(request, res);
            }
            if (action === "confirmLink") {
              const res = await confirmTelegramLink({ data: { slot } });
              if (!res.ok) {
                return jsonResponse(request, res, { status: 400 });
              }
              return jsonResponse(request, res);
            }
            if (action === "unlink") {
              const res = await unlinkTelegram({ data: { slot } });
              return jsonResponse(request, res);
            }
            if (action === "test") {
              const res = await sendTelegramTest({ data: { slot } });
              if (!res.ok) {
                return jsonResponse(request, res, { status: 400 });
              }
              return jsonResponse(request, res);
            }
            return jsonResponse(
              request,
              {
                ok: false,
                error:
                  "Geçersiz işlem. action: saveToken | startLink | confirmLink | unlink | test",
              },
              { status: 400 },
            );
          } catch (err) {
            if (isAuthError(err, "admin")) {
              // Owner-only vs unauthenticated both throw UNAUTHORIZED_ADMIN.
              if (role === "assistant" && action === "saveToken") {
                return jsonResponse(
                  request,
                  { ok: false, error: "Bot tokenini yalnızca yönetici kaydeder." },
                  { status: 403 },
                );
              }
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
