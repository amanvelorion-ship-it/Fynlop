import type { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="admin-app">
      <AdminSidebar adminEmail={process.env.ADMIN_EMAIL ?? ""} />
      <main className="admin-main">{children}</main>
    </div>
  );
}
