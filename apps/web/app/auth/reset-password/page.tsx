"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";

function ResetForm() {
  const token = useSearchParams().get("token") || "";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password"));
    try {
      const result = await apiFetch<{ message: string }>(
        "/auth/reset-password",
        { method: "POST", body: JSON.stringify({ token, password }) },
      );
      setMessage(result.message);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Reset failed");
    }
  }
  return (
    <div className="simple-auth">
      <form className="auth-form" onSubmit={submit}>
        <span className="eyebrow">Secure account recovery</span>
        <h2>Choose a new password</h2>
        {message ? (
          <>
            <div className="success-message">{message}</div>
            <Link className="button button-full" href="/auth/login">
              Sign in
            </Link>
          </>
        ) : (
          <>
            {error && <div className="form-alert">{error}</div>}
            <label className="form-field">
              <span>New password</span>
              <input
                required
                name="password"
                type="password"
                minLength={12}
                placeholder="At least 12 characters"
              />
              <small>
                Include uppercase, lowercase, a number and a symbol.
              </small>
            </label>
            <button className="button button-full" disabled={!token}>
              Reset password
            </button>
          </>
        )}
      </form>
    </div>
  );
}
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
