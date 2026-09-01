"use client";

import { Search, ShieldCheck, UserCog } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Toast } from "@/components/toast";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";
import { Paginated, Role, User } from "@/lib/types";

export default function UsersPage() {
  const { user: current } = useAuth();
  const [result, setResult] = useState<Paginated<User>>();
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const load = useCallback((term = "") => {
    apiFetch<Paginated<User>>(
      `/users?limit=50&search=${encodeURIComponent(term)}`,
    ).then(setResult);
  }, []);
  useEffect(() => load(), [load]);
  async function role(id: string, value: Role) {
    await apiFetch(`/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role: value }),
    });
    setToast("User role updated and recorded in the audit trail.");
    load(search);
  }
  async function status(id: string, value: string) {
    await apiFetch(`/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: value }),
    });
    setToast(
      "Account status updated; active sessions were revoked where required.",
    );
    load(search);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    load(search);
  }
  return (
    <AppShell
      roles={["ADMIN"]}
      title="User management"
      description="Control access, responsibilities and account availability across the institution."
      action={
        <div className="heading-symbol">
          <UserCog />
        </div>
      }
    >
      <form className="table-search" onSubmit={submit}>
        <Search size={17} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email or department"
        />
        <button>Search</button>
      </form>
      {!result ? (
        <div className="inline-loading">
          <span className="spinner" />
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last active</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="table-user">
                      <span className="avatar">
                        {user.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <span>
                        <strong>
                          {user.name}
                          {user.id === current?.id && " (you)"}
                        </strong>
                        <small>{user.email}</small>
                      </span>
                    </div>
                  </td>
                  <td>{user.department || "—"}</td>
                  <td>
                    <select
                      disabled={user.id === current?.id}
                      value={user.role}
                      onChange={(event) =>
                        void role(user.id, event.target.value as Role)
                      }
                    >
                      <option value="STUDENT">Student</option>
                      <option value="STAFF">Staff</option>
                      <option value="LIBRARIAN">Librarian</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td>
                    <select
                      disabled={user.id === current?.id}
                      value={user.status}
                      onChange={(event) =>
                        void status(user.id, event.target.value)
                      }
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="DEACTIVATED">Deactivated</option>
                    </select>
                  </td>
                  <td>
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="admin-note">
        <ShieldCheck />
        <p>
          Every role and status change records the administrator, target,
          before-and-after values, IP address and timestamp.
        </p>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </AppShell>
  );
}
