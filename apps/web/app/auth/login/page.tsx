"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
} from "lucide-react";
import { FormEvent, Suspense, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await login(String(form.get("email")), String(form.get("password")));
      router.push(search.get("next") || "/dashboard");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-story">
        <Link className="brand brand-light" href="/">
          <span className="brand-mark">
            <BookOpen />
          </span>{" "}
          Scholar<span>Shelf</span>
        </Link>
        <div>
          <span className="pill">
            <Sparkles size={14} /> Welcome back
          </span>
          <h1>
            Continue your path
            <br />
            through knowledge.
          </h1>
          <p>
            Your saved resources, recent reading and personalized suggestions
            are waiting.
          </p>
        </div>
        <blockquote>
          “The most valuable library is the one that helps you make the next
          connection.”
        </blockquote>
      </section>
      <section className="auth-form-side">
        <form className="auth-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">Institutional access</span>
            <h2>Sign in to ScholarShelf</h2>
            <p>Use your verified institutional account.</p>
          </div>
          {error && <div className="form-alert">{error}</div>}
          <label className="form-field">
            <span>Email address</span>
            <div className="input-icon">
              <Mail size={17} />
              <input
                required
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.edu"
              />
            </div>
          </label>
          <label className="form-field">
            <span>Password</span>
            <div className="input-icon">
              <LockKeyhole size={17} />
              <input
                required
                type={show ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Your password"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label="Show password"
              >
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          <div className="form-between">
            <label className="check-line">
              <input type="checkbox" /> Remember this device
            </label>
            <Link href="/auth/forgot-password">Forgot password?</Link>
          </div>
          <button className="button button-full" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner spinner-small" /> Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
          <p className="form-switch">
            New to ScholarShelf?{" "}
            <Link href="/auth/register">Create an account</Link>
          </p>
          <div className="demo-note">
            <strong>Demo student</strong>
            <span>student@example.edu · StudentPass123!</span>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="page-state">
          <span className="spinner" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
