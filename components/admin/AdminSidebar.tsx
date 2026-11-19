"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";
import { signOutAdmin } from "../../app/admin/actions";

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Standalone books", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminSidebar({ adminEmail }: { adminEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar">
      <Link href="/admin/dashboard" className="admin-sidebar-brand" aria-label="FYNLOP admin dashboard">
        <Image src="/fynlop-logo.png" alt="FYNLOP" width={2146} height={733} />
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
              <link.icon className="admin-nav-icon" aria-hidden="true" size={18} />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="admin-sidebar-bottom">
        <Link href="/" className="admin-nav-link">
          <ExternalLink className="admin-nav-icon" aria-hidden="true" size={18} />
          View storefront
        </Link>
        <form action={signOutAdmin}>
          <button className="admin-nav-link admin-logout" type="submit">
            <LogOut className="admin-nav-icon" aria-hidden="true" size={18} />
            Sign out
          </button>
        </form>
        <p>ADMIN · {adminEmail}</p>
      </div>
    </aside>
  );
}
