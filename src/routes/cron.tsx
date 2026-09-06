import { createFileRoute } from "@tanstack/react-router";
import { runReminderCron } from "@/lib/actions";

export const Route = createFileRoute("/cron")({
  validateSearch: (s: Record<string, unknown>) => ({ key: String(s.key ?? "") }),
  loaderDeps: ({ search }) => ({ key: search.key }),
  loader: async ({ deps }) => runReminderCron({ data: { key: deps.key } }),
  component: CronPing,
});

function CronPing() {
  const data = Route.useLoaderData();
  return (
    <pre className="p-6 text-sm text-muted">
      {data.ok ? `ok ${data.clock}` : "yetkisiz"}
    </pre>
  );
}
