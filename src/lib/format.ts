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
  "event.create": "Created event",
  "event.update": "Updated event",
  "template.create": "Created template",
  "template.update": "Updated template layout",
  "template.approve": "Approved template",
  "template.reject": "Rejected template",
  "template.revert": "Reverted template to draft",
  "certificate.issue": "Issued certificate",
  "certificate.revoke": "Revoked certificate",
  "certificate.reissue": "Reissued certificate",
  "import.start": "Started CSV import",
  "club.create": "Onboarded club",
  "club.branding.update": "Updated club branding",
  "club.switch": "Switched acting club",
  "user.invite": "Invited admin",
  "user.disable": "Disabled admin",
  "district.create": "Created district",
  // Legacy underscore keys (if any old rows exist)
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
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatAuditTarget(
  targetType: string,
  metadata?: unknown,
): string {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const rec = metadata as Record<string, unknown>;
    if (typeof rec.uniqueId === "string" && rec.uniqueId.trim()) {
      return rec.uniqueId.trim();
    }
    if (typeof rec.name === "string" && rec.name.trim()) {
      return rec.name.trim();
    }
    if (typeof rec.slug === "string" && rec.slug.trim()) {
      return rec.slug.trim();
    }
  }
  return targetType;
}

export function formatCheckedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Colombo",
    });
  } catch {
    return iso;
  }
}
