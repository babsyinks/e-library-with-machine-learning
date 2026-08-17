"use client";

import { CheckCircle2, XCircle, X } from "lucide-react";
import { useEffect } from "react";

export function Toast({
  message,
  kind = "success",
  onClose,
}: {
  message: string;
  kind?: "success" | "error";
  onClose(): void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`toast toast-${kind}`} role="status">
      {kind === "success" ? <CheckCircle2 size={19} /> : <XCircle size={19} />}
      <span>{message}</span>
      <button onClick={onClose} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
