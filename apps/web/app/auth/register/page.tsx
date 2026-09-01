"use client";

import Link from "next/link";
import {
  BookOpen,
  Check,
  GraduationCap,
  Mail,
  Sparkles,
  UserRound,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";

export default function RegisterPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiFetch<{ message: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      setDone(result.message);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Registration failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story auth-story-coral">
        <Link className="brand brand-light" href="/">
          <span className="brand-mark">
            <BookOpen />
          </span>{" "}
          Scholar<span>Shelf</span>
        </Link>
        <div>
          <span className="pill">
            <Sparkles size={14} /> One academic community
          </span>
          <h1>
            Turn a catalog
            <br />
            into your library.
          </h1>
          <p>
            Save useful sources, receive explainable suggestions, and keep a
            private view of your learning activity.
          </p>
          <ul className="auth-benefits">
            <li>
              <Check /> Librarian-approved resources
            </li>
            <li>
              <Check /> Recommendations based on academic topics
            </li>
            <li>
              <Check /> Your activity stays private by default
            </li>
          </ul>
        </div>
      </section>
      <section className="auth-form-side">
        <form className="auth-form auth-form-wide" onSubmit={submit}>
          <div>
            <span className="eyebrow">Join your library</span>
            <h2>Create an account</h2>
            <p>
              Registration is limited to your institution&apos;s email domain.
            </p>
          </div>
          {done ? (
            <div className="success-panel">
              <span>
                <Mail />
              </span>
              <h3>Check your inbox</h3>
              <p>{done}</p>
              <Link className="button button-full" href="/auth/login">
                Return to sign in
              </Link>
            </div>
          ) : (
            <>
              {error && <div className="form-alert">{error}</div>}
              <div className="form-two">
                <label className="form-field">
                  <span>Full name</span>
                  <div className="input-icon">
                    <UserRound size={17} />
                    <input
                      required
                      name="name"
                      minLength={2}
                      placeholder="Your full name"
                    />
                  </div>
                </label>
                <label className="form-field">
                  <span>Department</span>
                  <div className="input-icon">
                    <GraduationCap size={17} />
                    <input name="department" placeholder="Computer Science" />
                  </div>
                </label>
              </div>
              <label className="form-field">
                <span>Institutional email</span>
                <div className="input-icon">
                  <Mail size={17} />
                  <input
                    required
                    type="email"
                    name="email"
                    placeholder="you@example.edu"
                  />
                </div>
              </label>
              <label className="form-field">
                <span>Password</span>
                <input
                  required
                  type="password"
                  name="password"
                  minLength={12}
                  autoComplete="new-password"
                  placeholder="At least 12 characters"
                />
                <small>Use uppercase, lowercase, a number and a symbol.</small>
              </label>
              <label className="check-line">
                <input required type="checkbox" /> I agree to responsible use of
                institutional resources and the privacy notice.
              </label>
              <button className="button button-full" disabled={busy}>
                {busy ? "Creating account…" : "Create account"}
              </button>
              <p className="form-switch">
                Already registered? <Link href="/auth/login">Sign in</Link>
              </p>
            </>
          )}
        </form>
      </section>
    </div>
  );
}
