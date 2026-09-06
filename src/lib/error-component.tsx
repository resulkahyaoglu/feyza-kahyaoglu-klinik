import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-sand px-6 text-center text-ink">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-display text-lg">Bir şeyler ters gitti</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {error.message || "Beklenmeyen bir hata oluştu. Sayfayı yenilemeyi deneyin."}
      </p>
    </main>
  );
}
