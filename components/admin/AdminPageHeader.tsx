import type { ReactNode } from "react";

export default function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div>
        <p className="admin-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="admin-muted">{description}</p>}
      </div>
      {action && <div className="admin-header-action">{action}</div>}
    </header>
  );
}
