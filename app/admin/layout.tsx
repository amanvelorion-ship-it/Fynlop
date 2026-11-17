import { Suspense } from "react";
import "./admin.css";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<p className="admin-muted">Loading admin workspace…</p>}>
      {children}
    </Suspense>
  );
}
