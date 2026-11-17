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
  icon: string;
  detail?: string;
}) {
  return (
    <article className="admin-stat-card">
      <div className="admin-stat-top">
        <span>{title}</span>
        <span className="admin-stat-icon" aria-hidden="true">{icon}</span>
      </div>
      <strong className="admin-stat-value">{value}</strong>
      <p className="admin-stat-detail">
        {change && <span>{change}</span>}
        {detail}
      </p>
    </article>
  );
}
