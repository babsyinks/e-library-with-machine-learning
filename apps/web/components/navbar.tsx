"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "./auth-provider";

const publicLinks = [
  ["/catalog", "Explore"],
  ["/collections", "Collections"],
  ["/about", "How it works"],
] as const;

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const close = () => setOpen(false);
  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link className="brand" href="/" onClick={close}>
          <span className="brand-mark">
            <BookOpen size={22} strokeWidth={2.1} />
          </span>
          <span>
            Scholar<span>Shelf</span>
          </span>
        </Link>
        <button
          className="menu-button"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav className={`main-nav ${open ? "open" : ""}`}>
          {publicLinks.map(([href, label]) => (
            <Link
              key={href}
              className={pathname.startsWith(href) ? "active" : ""}
              href={href}
              onClick={close}
            >
              {label}
            </Link>
          ))}
          {!loading && !user && (
            <div className="nav-actions">
              <Link href="/auth/login" onClick={close}>
                Sign in
              </Link>
              <Link
                className="button button-small"
                href="/auth/register"
                onClick={close}
              >
                Join the library
              </Link>
            </div>
          )}
          {!loading && user && (
            <div className="profile-wrap">
              <button
                className="profile-button"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <span className="avatar">
                  {user.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="profile-copy">
                  <strong>{user.name}</strong>
                  <small>{user.role.toLowerCase()}</small>
                </span>
                <ChevronDown size={16} />
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <Link
                    href="/dashboard"
                    onClick={() => {
                      close();
                      setProfileOpen(false);
                    }}
                  >
                    <LayoutDashboard size={16} /> Dashboard
                  </Link>
                  {(user.role === "STAFF" ||
                    user.role === "LIBRARIAN" ||
                    user.role === "ADMIN") && (
                    <Link href="/staff/uploads">
                      <Upload size={16} />{" "}
                      {user.role === "LIBRARIAN" ? "Curation queue" : "Uploads"}
                    </Link>
                  )}
                  {(user.role === "LIBRARIAN" || user.role === "ADMIN") && (
                    <Link href="/analytics">
                      <BarChart3 size={16} /> Analytics
                    </Link>
                  )}
                  <Link href="/settings">
                    <Settings size={16} /> Settings
                  </Link>
                  <button onClick={() => void logout()}>
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
