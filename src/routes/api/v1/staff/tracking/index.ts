import { createFileRoute } from "@tanstack/react-router";
import {
  deleteLab,
  deleteLabValue,
  loadLabReport,
  saveLabStaffNote,
  saveLabValue,
} from "@/lib/actions";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { getStaffRole, isAuthError } from "@/lib/session";
import {
  eatTriggerLabel,
  LAB_MARKERS,
  labMarkerMeta,
  labOutOfRange,
  waterTargetMl,
} from "@/lib/wellness";

export const Route = createFileRoute("/api/v1/staff/tracking/")({
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
          const data = await loadLabReport();
          if (!data.auth) {
            return jsonResponse(
              request,
              { auth: false, error: "Personel oturumu gerekli." },
              { status: 401 },
            );
          }
          const logs = data.todayLogs ?? [];
          const lowWater = logs
            .filter((row) => {
              const target = waterTargetMl(row.weight);
              return Number(row.water_ml) < target * 0.7;
            })
            .map((row) => {
              const target = waterTargetMl(row.weight);
              return {
                id: row.id,
                full_name: row.full_name,
                water_ml: Number(row.water_ml),
                target_ml: target,
                sweaty: Number(row.sweaty) === 1,
                sleep_hours: row.sleep_hours,
                stress: row.stress,
              };
            });
          const shortSleep = logs.filter(
            (row) => row.sleep_hours != null && Number(row.sleep_hours) < 6,
          );
          const highStress = logs.filter(
            (row) => row.stress != null && Number(row.stress) >= 4,
          );
          const sleepStress = [
            ...shortSleep,
            ...highStress.filter((r) => !shortSleep.some((s) => s.id === r.id)),
          ].map((row) => ({
            id: row.id,
            full_name: row.full_name,
            sleep_hours: row.sleep_hours,
            stress: row.stress,
          }));
          const flagged = (data.labValues ?? [])
            .map((v) => {
              const flag = labOutOfRange(
                v.marker,
                Number(v.value),
                v.ref_min,
                v.ref_max,
              );
              if (!flag) return null;
              const meta = labMarkerMeta(v.marker);
              return {
                id: v.id,
                user_id: v.user_id,
                client_name: v.client_name,
                marker: v.marker,
                label: meta?.label ?? v.marker,
                value: Number(v.value),
                unit: v.unit ?? meta?.unit ?? "",
                flag,
                taken_at: String(v.taken_at).slice(0, 10),
              };
            })
            .filter(Boolean);

          return jsonResponse(request, {
            auth: true,
            role,
            stats: data.stats,
            todayLogs: logs.map((row) => ({
              id: row.id,
              full_name: row.full_name,
              water_ml: Number(row.water_ml),
              target_ml: waterTargetMl(row.weight),
              sleep_hours: row.sleep_hours,
              stress: row.stress,
              sweaty: Number(row.sweaty) === 1,
              weight: row.weight,
            })),
            lowWater,
            sleepStress,
            skipped: data.skipped ?? [],
            emotionalWeek: (data.emotionalWeek ?? []).map((row) => ({
              id: row.id,
              full_name: row.full_name,
              n: row.n,
              last_trigger: row.last_trigger,
              last_trigger_label: eatTriggerLabel(row.last_trigger),
            })),
            flagged,
            labValues: (data.labValues ?? []).map((v) => ({
              id: v.id,
              user_id: v.user_id,
              client_name: v.client_name,
              marker: v.marker,
              label: labMarkerMeta(v.marker)?.label ?? v.marker,
              value: Number(v.value),
              unit: v.unit ?? "",
              notes: v.notes ?? "",
              ref_min: v.ref_min,
              ref_max: v.ref_max,
              taken_at: String(v.taken_at).slice(0, 10),
              flag: labOutOfRange(v.marker, Number(v.value), v.ref_min, v.ref_max),
            })),
            uploads: (data.rows ?? []).map((r) => ({
              id: r.id,
              user_id: r.user_id,
              client_name: r.client_name,
              title: r.title,
              note: r.note ?? "",
              staff_note: r.staff_note ?? "",
              kind: r.kind,
              file_name: r.file_name ?? "",
              mime: r.mime ?? "",
              is_read: Number(r.is_read) === 1,
              created_at: String(r.created_at).slice(0, 19),
            })),
            markers: LAB_MARKERS.map((m) => ({
              key: m.key,
              label: m.label,
              unit: m.unit,
              min: m.min,
              max: m.max,
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
          const body = await readJsonBody<{
            action?: string;
            id?: number;
            note?: string;
            userId?: number;
            takenAt?: string;
            marker?: string;
            value?: number;
            notes?: string;
            refMin?: number;
            refMax?: number;
            customLabel?: string;
            customUnit?: string;
          }>(request);
          const action = String(body?.action || "").trim();
          try {
            if (action === "staffNote") {
              const id = Number(body?.id);
              if (!Number.isFinite(id) || id <= 0) {
                return jsonResponse(
                  request,
                  { ok: false, error: "Geçersiz dosya kimliği." },
                  { status: 400 },
                );
              }
              const res = await saveLabStaffNote({
                data: { id, note: String(body?.note ?? "") },
              });
              return jsonResponse(request, res);
            }
            if (action === "deleteLab") {
              const id = Number(body?.id);
              if (!Number.isFinite(id) || id <= 0) {
                return jsonResponse(
                  request,
                  { ok: false, error: "Geçersiz dosya kimliği." },
                  { status: 400 },
                );
              }
              const res = await deleteLab({ data: { id } });
              if (!res.ok) {
                return jsonResponse(request, res, { status: 400 });
              }
              return jsonResponse(request, res);
            }
            if (action === "saveValue") {
              const userId = Number(body?.userId);
              const value = Number(body?.value);
              const takenAt = String(body?.takenAt || "").trim();
              const marker = String(body?.marker || "").trim();
              if (!Number.isFinite(userId) || userId <= 0) {
                return jsonResponse(
                  request,
                  { ok: false, error: "Danışan seçin." },
                  { status: 400 },
                );
              }
              if (!takenAt || !marker || !Number.isFinite(value)) {
                return jsonResponse(
                  request,
                  { ok: false, error: "Tarih, parametre ve değer gerekli." },
                  { status: 400 },
                );
              }
              const res = await saveLabValue({
                data: {
                  userId,
                  takenAt,
                  marker,
                  value,
                  notes: body?.notes,
                  refMin: body?.refMin,
                  refMax: body?.refMax,
                  customLabel: body?.customLabel,
                  customUnit: body?.customUnit,
                },
              });
              if (!res.ok) {
                return jsonResponse(request, res, { status: 400 });
              }
              return jsonResponse(request, res);
            }
            if (action === "deleteValue") {
              const id = Number(body?.id);
              if (!Number.isFinite(id) || id <= 0) {
                return jsonResponse(
                  request,
                  { ok: false, error: "Geçersiz değer kimliği." },
                  { status: 400 },
                );
              }
              const res = await deleteLabValue({ data: { id } });
              return jsonResponse(request, res);
            }
            return jsonResponse(
              request,
              {
                ok: false,
                error:
                  "Geçersiz işlem. action: staffNote | deleteLab | saveValue | deleteValue",
              },
              { status: 400 },
            );
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
