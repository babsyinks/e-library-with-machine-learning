"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  Bookmark,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { ProtectedPage } from "./protected-page";
import { useAuth } from "./auth-provider";
import { Role } from "@/lib/types";

export function AppShell({
  children,
  title,
  description,
  roles,
  action,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  roles?: Role[];
  action?: React.ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const links = [
    {
      href: "/dashboard",
      label: "Overview",
      icon: LayoutDashboard,
      show: true,
    },
    { href: "/library", label: "Saved library", icon: Bookmark, show: true },
    {
      href: "/catalog",
      label: "Explore catalog",
      icon: BookOpenCheck,
      show: true,
    },
    {
      href: "/staff/uploads",
      label: user?.role === "LIBRARIAN" ? "Curation queue" : "Uploads",
      icon: Upload,
      show: ["STAFF", "LIBRARIAN", "ADMIN"].includes(user?.role || ""),
    },
    {
      href: "/analytics",
      label: "Analytics",
      icon: BarChart3,
      show: ["LIBRARIAN", "ADMIN"].includes(user?.role || ""),
    },
    {
      href: "/admin/users",
      label: "User management",
      icon: Users,
      show: user?.role === "ADMIN",
    },
    {
      href: "/admin/categories",
      label: "Categories",
      icon: ScrollText,
      show: ["LIBRARIAN", "ADMIN"].includes(user?.role || ""),
    },
    {
      href: "/admin/audit",
      label: "Audit trail",
      icon: ShieldCheck,
      show: user?.role === "ADMIN",
    },
    { href: "/settings", label: "Settings", icon: Settings, show: true },
  ];
  return (
    <ProtectedPage roles={roles}>
      <div className="app-layout">
        <aside className="app-sidebar">
          <div className="sidebar-user">
            <span className="avatar avatar-large">
              {user?.name
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span>
              <strong>{user?.name}</strong>
              <small>{user?.department || "Institution member"}</small>
            </span>
          </div>
          <nav>
            {links
              .filter((link) => link.show)
              .map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={pathname === href ? "active" : ""}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              ))}
          </nav>
          <div className="sidebar-note">
            <strong>Private by design</strong>
            <p>
              Your individual reading activity is visible only to you and system
              administrators.
            </p>
          </div>
        </aside>
        <section className="app-content">
          <header className="app-heading">
            <div>
              <span className="eyebrow">ScholarShelf workspace</span>
              <h1>{title}</h1>
              {description && <p>{description}</p>}
            </div>
            {action}
          </header>
          {children}
        </section>
      </div>
    </ProtectedPage>
  );
}
