import { useState } from "react";
import { toast } from "sonner";
import { getDietText } from "@/lib/actions";

export function DietTextToggle({
  dietId,
  text,
}: {
  dietId: number;
  text: string;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(text);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (!body.trim()) {
      setBusy(true);
      try {
        const res = await getDietText({ data: { id: dietId } });
        if (!res.ok || !res.text?.trim()) {
          toast.error("Bu PDF’den metin çıkarılamadı.");
          return;
        }
        setBody(res.text);
      } catch {
        toast.error("Metin okunamadı.");
        return;
      } finally {
        setBusy(false);
      }
    }
    setOpen(true);
  }

  return (
    <div className="mt-3">
      <button type="button" className="btn btn-sm btn-secondary" onClick={() => void toggle()} disabled={busy}>
        {busy ? "Okunuyor…" : open ? "Kapat" : "Listeyi aç"}
      </button>
      {open && body ? (
        <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-sand p-3 font-sans text-sm text-ink-soft">
          {body}
        </pre>
      ) : null}
    </div>
  );
}
