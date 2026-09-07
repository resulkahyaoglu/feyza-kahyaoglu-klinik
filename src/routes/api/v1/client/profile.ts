import { createFileRoute } from "@tanstack/react-router";
import { clientUpdateProfile } from "@/lib/actions";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { getClientIdFromCookie, isAuthError } from "@/lib/session";

async function handleProfile(request: Request): Promise<Response> {
  if (!getClientIdFromCookie()) {
    return jsonResponse(
      request,
      { ok: false, error: "Danışan oturumu gerekli." },
      { status: 401 },
    );
  }
  const body = await readJsonBody<{ email?: string }>(request);
  if (!body) {
    return jsonResponse(
      request,
      { ok: false, error: "Geçersiz istek gövdesi." },
      { status: 400 },
    );
  }
  const email = String(body.email ?? "").trim();
  try {
    await clientUpdateProfile({ data: { email } });
    return jsonResponse(request, { ok: true, email: email || null });
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
}

export const Route = createFileRoute("/api/v1/client/profile")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      PATCH: async ({ request }) => runApi(request, () => handleProfile(request)),
      POST: async ({ request }) => runApi(request, () => handleProfile(request)),
    },
  },
});
