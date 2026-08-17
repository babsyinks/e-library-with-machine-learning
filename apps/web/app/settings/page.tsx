"use client";

import { Save, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Toast } from "@/components/toast";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";

export default function SettingsPage() {
  const { user, reloadUser } = useAuth();
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const body = Object.fromEntries(new FormData(event.currentTarget));
    await apiFetch("/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    await reloadUser();
    setToast("Profile updated.");
    setBusy(false);
  }
  return (
    <AppShell
      title="Account settings"
      description="Keep your academic profile accurate so department-based discovery remains useful."
    >
      <div className="settings-grid">
        <form className="panel-form" onSubmit={submit} key={user?.id}>
          <div>
            <span className="eyebrow">Profile</span>
            <h2>Personal details</h2>
          </div>
          <label className="form-field">
            <span>Full name</span>
            <input name="name" required defaultValue={user?.name} />
          </label>
          <label className="form-field">
            <span>Institutional email</span>
            <input value={user?.email || ""} disabled />
            <small>
              Email addresses are identity-bound and cannot be changed here.
            </small>
          </label>
          <label className="form-field">
            <span>Department</span>
            <input name="department" defaultValue={user?.department || ""} />
          </label>
          <label className="form-field">
            <span>Role</span>
            <input value={user?.role.toLowerCase() || ""} disabled />
          </label>
          <button className="button" disabled={busy}>
            <Save size={17} />
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
        <aside className="privacy-panel">
          <ShieldCheck />
          <h2>Your privacy</h2>
          <p>
            Personal activity powers recommendations and your private summary.
            Librarian and staff dashboards use aggregate counts only.
          </p>
          <ul>
            <li>Views and downloads are access-controlled.</li>
            <li>Files use five-minute signed URLs.</li>
            <li>No activity data is shared outside the institution.</li>
          </ul>
        </aside>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </AppShell>
  );
}
