"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

function Verify() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    apiFetch("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(() => setState("done"))
      .catch(() => setState("error"));
  }, [token]);
  return (
    <div className="simple-auth">
      <div className="auth-form verify-panel">
        {state === "loading" && (
          <>
            <span className="spinner" />
            <h2>Verifying your email…</h2>
          </>
        )}
        {state === "done" && (
          <>
            <CheckCircle2 className="verify-success" />
            <h2>Email verified</h2>
            <p>Your account is ready.</p>
            <Link className="button" href="/auth/login">
              Continue to sign in
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="verify-error" />
            <h2>Link unavailable</h2>
            <p>This verification link is invalid or has expired.</p>
            <Link className="button" href="/auth/register">
              Register again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <Verify />
    </Suspense>
  );
}
