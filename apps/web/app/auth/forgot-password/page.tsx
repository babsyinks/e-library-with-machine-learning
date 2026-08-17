"use client";

import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const email = String(new FormData(event.currentTarget).get("email"));
    const result = await apiFetch<{ message: string }>(
      "/auth/forgot-password",
      { method: "POST", body: JSON.stringify({ email }) },
    );
    setMessage(result.message);
    setBusy(false);
  }
  return (
    <div className="simple-auth">
      <form className="auth-form" onSubmit={submit}>
        <Link className="back-link" href="/auth/login">
          <ArrowLeft size={16} /> Back to sign in
        </Link>
        <span className="auth-round-icon">
          <Mail />
        </span>
        <h2>Reset your password</h2>
        <p>
          Enter your institutional email. If an active account exists,
          we&apos;ll send a 30-minute reset link.
        </p>
        {message ? (
          <div className="success-message">{message}</div>
        ) : (
          <>
            <label className="form-field">
              <span>Email address</span>
              <input
                required
                name="email"
                type="email"
                placeholder="you@example.edu"
              />
            </label>
            <button className="button button-full" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
