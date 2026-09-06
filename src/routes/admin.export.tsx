import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { downloadBase64 } from "@/lib/download";
import {
  downloadClinicBackup,
  exportAllClinicData,
  exportAppointments,
  getStaffSession,
  loadBackupStatus,
  runClinicBackupNow,
} from "@/lib/actions";
import { formatDateTr } from "@/lib/clinic";

export const Route = createFileRoute("/admin/export")({
  loader: async () => {
    const session = await getStaffSession();
    if (!session.auth) throw redirect({ to: "/admin/login" });
    if (session.role !== "admin") throw redirect({ to: "/admin" });
    const backups = await loadBackupStatus();
    return { backups };
  },
  component: ExportPage,
});

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function ExportPage() {
  const { backups } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const items = backups.auth ? backups.items : [];
  const last = backups.auth ? backups.last : null;

  async function runExcel(kind: "all" | "appt") {
    setBusy(kind);
    try {
      const file = kind === "all" ? await exportAllClinicData() : await exportAppointments();
      downloadBase64(file.filename, file.mime, file.b64);
      toast.success("Excel indirildi.");
    } catch {
      toast.error("Dosya hazırlanamadı.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell title="Yedek">
      <section className="surface max-w-2xl space-y-3 p-5">
        <h2 className="text-lg">Veritabanı yedeği</h2>
        <p className="text-sm text-ink-soft">
          Her gece 03:00’te (Hayalhost cron açıksa) tablolar JSON olarak sunucuya yazılır. Son 14 gün
          tutulur. Asıl güvence: bu dosyayı bilgisayarınıza veya Google Drive’a indirmek.
        </p>
        <p className="text-sm text-muted">
          PDF ve öğün/tahlil fotoğrafları bu JSON’da yok; onlar sunucudaki <span className="font-medium">data</span> klasöründe.
          Hayalhost dosya yöneticisinden o klasörü de ara sıra kopyalayın.
        </p>
        {last ? (
          <p className="text-sm text-brand-dark">
            Son yedek: {formatDateTr(last.taken)} · {formatBytes(last.bytes)}
          </p>
        ) : (
          <p className="text-sm text-muted">Henüz otomatik yedek yok. Şimdi bir tane alın.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy !== null}
            onClick={async () => {
              setBusy("now");
              try {
                const res = await runClinicBackupNow();
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                if ("b64" in res && res.b64) {
                  downloadBase64(res.filename, res.mime, res.b64);
                }
                toast.success("Yedek alındı, dosya indi.");
                await router.invalidate();
              } catch {
                toast.error("Yedek alınamadı.");
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "now" ? "Alınıyor…" : "Şimdi yedek al"}
          </button>
        </div>
        {items.length > 0 ? (
          <ul className="divide-y divide-line text-sm">
            {items.map((row) => (
              <li key={row.name} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {formatDateTr(row.taken)} · {formatBytes(row.bytes)}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  disabled={busy !== null}
                  onClick={async () => {
                    setBusy(row.name);
                    try {
                      const file = await downloadClinicBackup({ data: { name: row.name } });
                      if (!file.ok) {
                        toast.error(file.error);
                        return;
                      }
                      downloadBase64(file.filename, file.mime, file.b64);
                    } catch {
                      toast.error("İndirilemedi.");
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  <Download className="size-4" />
                  İndir
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="surface mt-6 max-w-2xl space-y-3 p-5">
        <h2 className="text-lg">PostgreSQL durumu</h2>
        <p className="text-sm text-muted">
          Bu klinik için ekstra araç (Grafana, pganalyze) gerekmez. Satır sayısı ve indeks kullanımı burada.
          Seq yüksek, indeks 0 ise o tablo taranıyor demektir.
        </p>
        {backups.auth && (backups.dbName || backups.dbSize) ? (
          <p className="text-sm text-ink-soft">
            {backups.dbName ? <span>Veritabanı: {backups.dbName}</span> : null}
            {backups.dbSize ? <span>{backups.dbName ? " · " : ""}Boyut: {backups.dbSize}</span> : null}
          </p>
        ) : null}
        {backups.auth && backups.tables.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="py-1 pr-3 font-medium">Tablo</th>
                  <th className="py-1 pr-3 font-medium">Satır</th>
                  <th className="py-1 pr-3 font-medium">Boyut</th>
                  <th className="py-1 pr-3 font-medium">İndeks</th>
                  <th className="py-1 font-medium">Seq</th>
                </tr>
              </thead>
              <tbody>
                {backups.tables.map((t) => (
                  <tr key={t.name} className="border-t border-line">
                    <td className="py-1.5 pr-3">{t.name}</td>
                    <td className="py-1.5 pr-3">{t.rows}</td>
                    <td className="py-1.5 pr-3">{t.size}</td>
                    <td className="py-1.5 pr-3">{t.idx}</td>
                    <td className={`py-1.5 ${t.seq > 200 && t.idx === 0 ? "font-medium text-warn" : ""}`}>
                      {t.seq}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">İstatistik bu ortamda okunamadı. Canlı Postgres’te görünür.</p>
        )}
      </section>

      <section className="surface mt-6 max-w-2xl space-y-3 p-5">
        <h2 className="text-lg">Excel (okumak için)</h2>
        <p className="text-sm text-muted">
          Tabloları Excel’de açmak içindir. Geri yükleme dosyası değildir. Şifreler hash olarak yazar.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy !== null}
            onClick={() => void runExcel("all")}
          >
            {busy === "all" ? "Hazırlanıyor…" : "Tüm veriler Excel"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy !== null}
            onClick={() => void runExcel("appt")}
          >
            {busy === "appt" ? "Hazırlanıyor…" : "Sadece randevular"}
          </button>
        </div>
      </section>
    </AdminShell>
  );
}
