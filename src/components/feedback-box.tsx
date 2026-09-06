import { useState } from "react";
import { toast } from "sonner";
import { submitFeedback } from "@/lib/actions";

export function FeedbackBox() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mb-4">
      <button
        type="button"
        className="btn btn-secondary w-full sm:w-auto"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Kapat" : "Görüş ve öneriler"}
      </button>
      {open ? (
        <article className="surface mt-3 space-y-3 p-5">
          <h2 className="text-lg">Görüş ve önerileriniz</h2>
          <p className="text-sm text-ink-soft">
            Görüş ve önerileriniz bizim için değerli. Size daha iyi hizmet verebilmek ve
            kliniğimizi birlikte geliştirmek için deneyiminizi, beklentinizi veya
            takıldığınız bir noktayı yazabilirsiniz. Yazdıklarınız yalnızca diyetisyeninize
            iletilir.
          </p>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const message = text.trim();
              if (message.length < 8) {
                toast.error("Biraz daha ayrıntı yazabilir misiniz?");
                return;
              }
              setBusy(true);
              try {
                const res = await submitFeedback({ data: { message } });
                if (!res.ok) {
                  toast.error(("error" in res && res.error) || "Gönderilemedi.");
                  return;
                }
                toast.success("Teşekkür ederiz, görüşünüz iletildi.");
                setText("");
                setOpen(false);
              } catch {
                toast.error("Gönderilemedi. Biraz sonra tekrar deneyin.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="field">
              <label htmlFor="feedback">Mesajınız</label>
              <textarea
                id="feedback"
                className="min-h-32"
                maxLength={2000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Düşüncelerinizi buraya yazabilirsiniz…"
              />
              <p className="text-xs text-muted">{text.length} / 2000</p>
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Gönderiliyor…" : "Gönder"}
            </button>
          </form>
        </article>
      ) : null}
    </div>
  );
}
