import type { LucideIcon } from "lucide-react";

export default function StatsCard({
  title,
  value,
  change,
  icon,
  detail,
}: {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  detail?: string;
}) {
  const Icon = icon;
  return (
    <article className="admin-stat-card">
      <div className="admin-stat-top">
        <span>{title}</span>
        <span className="admin-stat-icon" aria-hidden="true"><Icon size={16} /></span>
      </div>
      <strong className="admin-stat-value">{value}</strong>
      <p className="admin-stat-detail">
        {change && <span>{change}</span>}
        {detail}
      </p>
    </article>
  );
}
