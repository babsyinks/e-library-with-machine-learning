"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { apiFetch } from "@/lib/api";
import { dateLabel } from "@/lib/format";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { name: string; email: string } | null;
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>();
  useEffect(() => {
    apiFetch<{ items: AuditEntry[] }>("/audit-logs?limit=50").then((result) =>
      setEntries(result.items),
    );
  }, []);
  return (
    <AppShell
      roles={["ADMIN"]}
      title="Security audit trail"
      description="An append-only view of privileged actions across the platform."
      action={
        <div className="heading-symbol">
          <ShieldCheck />
        </div>
      }
    >
      {!entries ? (
        <div className="inline-loading">
          <span className="spinner" />
        </div>
      ) : (
        <div className="audit-list">
          {entries.map((entry) => (
            <article key={entry.id}>
              <span className="audit-dot" />
              <div>
                <strong>
                  {entry.action.toLowerCase().replaceAll("_", " ")}
                </strong>
                <p>
                  {entry.actor?.name || "System"} · {entry.entityType}
                  {entry.entityId ? ` ${entry.entityId.slice(0, 8)}…` : ""}
                </p>
                {entry.metadata && (
                  <code>{JSON.stringify(entry.metadata)}</code>
                )}
              </div>
              <span>
                <time>{dateLabel(entry.createdAt)}</time>
                <small>
                  {new Date(entry.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
                </small>
              </span>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
