import {
  clockHHMM,
  formatDateTr,
  formatKg,
  formatPrice,
  mealSlotLabel,
  offplanKindLabel,
  weekdayTr,
} from "@/lib/clinic";
import { packageBalance, type ClientPackage } from "@/lib/packages";
import { findClientById } from "@/lib/session";
import { waterTargetMl } from "@/lib/wellness";
import type { Sql } from "@/lib/db";

type ApptLite = {
  id: number;
  user_id: number | null;
  client_name: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  is_measure: number;
  notes: string | null;
  admin_notes: string | null;
};

function clip(s: string | null | undefined, n: number) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export async function buildAppointmentBriefing(
  sql: Sql,
  appt: ApptLite,
): Promise<{ title: string; body: string }> {
  const when = `${formatDateTr(appt.appointment_date)} ${clockHHMM(appt.appointment_time)} ${weekdayTr(appt.appointment_date)}`;
  const measure = Number(appt.is_measure) === 1 ? "Ölçüm var." : "";
  const title = `2 saat kala · ${appt.client_name}`;
  const head = [`${when} · ${appt.service_name}`, measure].filter(Boolean).join(" ");

  if (!appt.user_id) {
    return {
      title,
      body: `${head}\nPanel kaydı yok (siteden / isimsiz randevu).`,
    };
  }

  const dossier = await collectDossier(sql, appt.user_id, appt);
  const ai = await summarizeBriefing(dossier);
  const body = (ai || dossier).trim();
  return { title, body: body.slice(0, 3500) };
}

async function collectDossier(sql: Sql, userId: number, appt: ApptLite): Promise<string> {
  const user = await findClientById(sql, userId);
  const lines: string[] = [
    `Danışan: ${appt.client_name}`,
    user?.gender ? `Cinsiyet: ${user.gender}` : "",
    user?.target_weight ? `Hedef kilo: ${user.target_weight} kg` : "",
    user?.notes ? `Klinik notu: ${clip(user.notes, 220)}` : "",
    `Randevu: ${formatDateTr(appt.appointment_date)} ${clockHHMM(appt.appointment_time)} ${weekdayTr(appt.appointment_date)} · ${appt.service_name}`,
    Number(appt.is_measure) === 1 ? "Bu randevuda ölçüm var." : "",
    appt.admin_notes ? `Randevu notu: ${clip(appt.admin_notes, 160)}` : "",
    appt.notes ? `Kayıt notu: ${clip(appt.notes, 160)}` : "",
  ];

  try {
    const measures = await sql<{
      measure_date: string;
      weight: number | null;
      waist: number | null;
      belly: number | null;
      hip: number | null;
    }>`
      select measure_date, weight, waist, belly, hip
      from measurements where user_id = ${userId}
      order by measure_date desc, id desc
      limit 4
    `;
    if (measures.length) {
      lines.push("Ölçümler (yeni → eski):");
      for (const m of measures) {
        lines.push(
          `- ${formatDateTr(m.measure_date)} kilo ${formatKg(m.weight)} · bel ${m.waist ?? "—"} · göbek ${m.belly ?? "—"} · kalça ${m.hip ?? "—"}`,
        );
      }
    } else {
      lines.push("Ölçüm kaydı yok.");
    }
  } catch {
    lines.push("Ölçümler okunamadı.");
  }

  try {
    const diets = await sql<{ title: string }>`
      select title from diet_lists
      where user_id = ${userId} and is_active = 1
      order by created_at desc limit 2
    `;
    if (diets.length) lines.push(`Aktif diyet: ${diets.map((d) => d.title).join(" · ")}`);
    else lines.push("Aktif diyet listesi yok.");
  } catch {
    /* ignore */
  }

  try {
    const logs = await sql<{
      log_date: string;
      water_ml: number;
      sleep_hours: number | null;
      stress: number | null;
      mood: string | null;
      energy: number | null;
    }>`
      select log_date::text as log_date, water_ml, sleep_hours, stress, mood, energy
      from daily_logs where user_id = ${userId}
      order by log_date desc limit 7
    `;
    const lastW = (await sql<{ weight: number | null }>`
      select weight from measurements
      where user_id = ${userId} and weight is not null
      order by measure_date desc, id desc limit 1
    `)[0]?.weight;
    const target = waterTargetMl(lastW);
    if (logs.length) {
      lines.push(`Su hedefi ≈ ${target} ml. Son 7 gün:`);
      for (const r of logs) {
        lines.push(
          `- ${formatDateTr(r.log_date)} su ${r.water_ml} ml${r.sleep_hours != null ? ` · uyku ${r.sleep_hours} sa` : ""}${r.stress ? ` · stres ${r.stress}` : ""}${r.mood ? ` · ${r.mood}` : ""}`,
        );
      }
    } else {
      lines.push("Su / uyku kaydı yok.");
    }
  } catch {
    lines.push("Günlük takip okunamadı.");
  }

  try {
    const off = await sql<{
      created_at: string;
      slot: string;
      kind: string;
      detail: string | null;
    }>`
      select created_at::text as created_at, slot, kind, detail
      from offplan_logs where user_id = ${userId}
      order by created_at desc limit 8
    `;
    if (off.length) {
      lines.push("Plan dışı (son):");
      for (const o of off) {
        lines.push(
          `- ${formatDateTr(o.created_at)} ${mealSlotLabel(o.slot)} · ${offplanKindLabel(o.kind)}${o.detail ? ` · ${clip(o.detail, 80)}` : ""}`,
        );
      }
    } else {
      lines.push("Plan dışı kayıt yok.");
    }
  } catch {
    /* ignore */
  }

  try {
    const pkgs = await sql<ClientPackage>`
      select id, user_id, kind, title, total, next_no, unit, notes, is_active,
             created_at::text as created_at
      from client_packages where user_id = ${userId} and is_active = 1
    `;
    if (pkgs.length) {
      lines.push("Paket:");
      for (const p of pkgs) {
        const b = packageBalance(p);
        lines.push(
          `- ${p.title}: ${b.done ? "bitti" : `kalan ${b.remaining} ${b.unit}`} (${b.used}/${b.total})`,
        );
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const debt = await sql<{ n: number }>`
      select coalesce(sum(case when kind = 'borc' then amount else -amount end), 0)::int as n
      from client_debts where user_id = ${userId}
    `;
    const n = debt[0]?.n ?? 0;
    if (n > 0) lines.push(`Açık bakiye: ${formatPrice(n)}`);
  } catch {
    /* ignore */
  }

  try {
    const labs = await sql<{ taken_at: string; marker: string; value: number; unit: string }>`
      select taken_at::text as taken_at, marker, value, unit
      from lab_values where user_id = ${userId}
      order by taken_at desc, id desc
      limit 8
    `;
    if (labs.length) {
      lines.push("Kan değerleri (son):");
      for (const v of labs) {
        lines.push(`- ${formatDateTr(v.taken_at)} ${v.marker} ${v.value} ${v.unit}`.trim());
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const msgs = await sql<{ sender: string; message: string; created_at: string }>`
      select sender, message, created_at::text as created_at
      from messages where user_id = ${userId}
      order by created_at desc limit 3
    `;
    if (msgs.length) {
      lines.push("Son mesajlar:");
      for (const m of msgs.reverse()) {
        lines.push(`- ${m.sender === "client" ? "Danışan" : "Klinik"}: ${clip(m.message, 100)}`);
      }
    }
  } catch {
    /* ignore */
  }

  return lines.filter(Boolean).join("\n");
}

async function summarizeBriefing(dossier: string): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "Diyetisyen için seans öncesi brifing yazıyorsun. Yalnızca verilen kayıtlardaki rakamları kullan; uydurma. Türkçe, kısa maddeler. En fazla 12 satır. Son satır 'Bugün bak:' ile bitsin. Empatik ama klinik ol. Danışana mesaj değil, hekime not.",
          },
          {
            role: "user",
            content: `Bu randevu için brifing hazırla:\n\n${dossier.slice(0, 6000)}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim() || "";
    return text || null;
  } catch {
    return null;
  }
}
