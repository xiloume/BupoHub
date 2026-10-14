import { Bot, Cog, UserRound } from "lucide-react";
import { AUDIT_ACTION_LABELS } from "@/server/audit";
import { formatDate, formatRelative } from "@/lib/meta";
import { cn } from "@/lib/utils";

type Log = {
  id: string;
  action: string;
  actorType: "USER" | "BOT" | "SYSTEM";
  actorLabel: string | null;
  actor?: { username: string } | null;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  metadata: unknown;
  ip: string | null;
  createdAt: Date;
};

export function AuditRow({ log, compact = false }: { log: Log; compact?: boolean }) {
  const actor = log.actor?.username ?? log.actorLabel ?? (log.actorType === "SYSTEM" ? "Système" : log.actorType === "BOT" ? "Bot" : "Inconnu");
  const Icon = log.actorType === "BOT" ? Bot : log.actorType === "SYSTEM" ? Cog : UserRound;
  const label = AUDIT_ACTION_LABELS[log.action] ?? log.action;
  const danger = /delete|suspend|revoke|cancel/.test(log.action);
  return (
    <div className={cn("flex gap-3", compact ? "py-3 first:pt-0 last:pb-0" : "p-4")}>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", danger ? "bg-red-500/10 text-red-300" : "bg-bg-elevated text-fg-muted")}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{actor}</span>
          <span className="text-fg-muted"> · {label}</span>
          {log.targetLabel ? <span className="text-fg"> « {log.targetLabel} »</span> : null}
        </p>
        <p className="text-xs text-fg-subtle">
          {compact ? formatRelative(log.createdAt) : formatDate(log.createdAt)}
          {!compact && log.ip ? ` · ${log.ip}` : ""}
          {!compact && log.targetType ? ` · ${log.targetType}${log.targetId ? ` #${log.targetId.slice(0, 8)}` : ""}` : ""}
          <code className="ml-2 rounded bg-white/5 px-1 py-0.5 font-mono text-[10px]">{log.action}</code>
        </p>
        {!compact && log.metadata && Object.keys(log.metadata as object).length ? (
          <pre className="mt-2 max-w-full overflow-x-auto rounded-lg bg-bg-elevated p-2 font-mono text-[11px] text-fg-muted">
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
