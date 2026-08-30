import { formatDate } from "@/lib/pricing";
import { statusLabel } from "@/lib/presentation/status";

type TimelineEvent = {
  id: string;
  action: string;
  createdAt: Date;
  actor?: { name: string } | null;
  metadata: unknown;
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return <ol className="timeline">{events.map((event) => <li key={event.id}><i /><div><strong>{statusLabel(event.action)}</strong><span>{formatDate(event.createdAt)} · {event.actor?.name ?? "Sistema"}</span></div></li>)}</ol>;
}
