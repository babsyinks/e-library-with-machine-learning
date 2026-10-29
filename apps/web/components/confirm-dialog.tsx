"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm(): Promise<void>;
  onCancel(): void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onCancel();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed");
      setBusy(false);
    }
  }

  return (
    <dialog
      className="confirm-dialog"
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div className="confirm-dialog-icon" aria-hidden="true">
        <AlertTriangle size={22} />
      </div>
      <h2 id="confirm-dialog-title">{title}</h2>
      <p id="confirm-dialog-description">{description}</p>
      {error && (
        <p className="confirm-dialog-error" role="alert">
          {error}
        </p>
      )}
      <div className="confirm-dialog-actions">
        <button
          className="button button-secondary"
          type="button"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="button button-danger"
          type="button"
          disabled={busy}
          onClick={() => void confirm()}
        >
          {busy ? "Deleting…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
