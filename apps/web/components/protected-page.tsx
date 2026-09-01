"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Role } from "@/lib/types";
import { useAuth } from "./auth-provider";

export function ProtectedPage({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const authorized = Boolean(user && (!roles || roles.includes(user.role)));

  useEffect(() => {
    if (!loading && !authorized) {
      router.replace(
        user
          ? "/dashboard"
          : `/auth/login?next=${encodeURIComponent(pathname)}`,
      );
    }
  }, [authorized, loading, pathname, router, user]);

  if (loading || !authorized) {
    return (
      <div className="page-state">
        <span className="spinner" /> <p>Opening your library…</p>
      </div>
    );
  }
  return children;
}
