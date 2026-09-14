/** Lightweight relative time — avoids date-fns. */
export function formatRelativeTime(date: Date | string, now = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.round((now.getTime() - d.getTime()) / 1000);
  if (Number.isNaN(seconds)) return "";
  if (seconds < 45) return "just now";
  if (seconds < 90) return "1 min ago";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toISOString().slice(0, 10);
}

const ACTION_LABELS: Record<string, string> = {
  create_event: "Created event",
  update_event: "Updated event",
  create_template: "Created template",
  update_template_layout: "Updated template layout",
  issue_certificate: "Issued certificate",
  revoke_certificate: "Revoked certificate",
  import_csv: "Imported CSV",
  approve_template: "Approved template",
  reject_template: "Rejected template",
  create_club: "Onboarded club",
  invite_club_admin: "Linked club admin",
};

export function formatAuditAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
