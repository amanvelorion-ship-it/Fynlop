"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAdmin } from "../../app/admin/actions";

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "◫" },
  { href: "/admin/products", label: "Products", icon: "▣" },
  { href: "/admin/orders", label: "Orders", icon: "↗" },
  { href: "/admin/users", label: "Users", icon: "◎" },
  { href: "/admin/analytics", label: "Analytics", icon: "⌁" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar">
      <Link href="/admin/dashboard" className="admin-sidebar-brand">
        <span aria-hidden="true">ϟ</span> FYNLOP<span className="admin-brand-dot">.</span>
      </Link>
      <p className="admin-sidebar-label">WORKSPACE</p>
      <nav className="admin-nav" aria-label="Admin navigation">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              className={`admin-nav-link${active ? " active" : ""}`}
              href={link.href}
              key={link.href}
              aria-current={active ? "page" : undefined}
            >
              <span className="admin-nav-icon" aria-hidden="true">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="admin-sidebar-bottom">
        <Link href="/" className="admin-nav-link">
          <span className="admin-nav-icon" aria-hidden="true">↗</span>
          View storefront
        </Link>
        <form action={signOutAdmin}>
          <button className="admin-nav-link admin-logout" type="submit">
            <span className="admin-nav-icon" aria-hidden="true">⇥</span>
            Sign out
          </button>
        </form>
        <p>ADMIN · aman.velorion@gmail.com</p>
      </div>
    </aside>
  );
}
