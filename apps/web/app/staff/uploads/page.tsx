"use client";

import {
  BarChart3,
  Check,
  FilePlus2,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Toast } from "@/components/toast";
import { useAuth } from "@/components/auth-provider";
import { ApiError, apiFetch } from "@/lib/api";
import { dateLabel, resourceTypeLabel } from "@/lib/format";
import { Category, Paginated, Resource } from "@/lib/types";

interface ResourceAnalytics {
  resource: {
    id: string;
    title: string;
    viewCount: number;
    downloadCount: number;
  };
  trend: Array<{ day: string; views: number; downloads: number }>;
}

export default function UploadsPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Resource[]>();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [analytics, setAnalytics] = useState<ResourceAnalytics>();
  const [toast, setToast] = useState<{
    message: string;
    kind: "success" | "error";
  }>();
  const canUpload = user?.role === "STAFF" || user?.role === "ADMIN";
  const canReview = user?.role === "LIBRARIAN" || user?.role === "ADMIN";

  const load = useCallback(async () => {
    if (!user) return;
    const path = canReview
      ? "/resources/review-queue?limit=50"
      : "/resources/mine?limit=50";
    const [queue, categoryResult] = await Promise.all([
      apiFetch<Paginated<Resource>>(path),
      apiFetch<Category[]>("/categories"),
    ]);
    setItems(queue.items);
    setCategories(categoryResult);
  }, [canReview, user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = new FormData(event.currentTarget);
      data.set(
        "tags",
        JSON.stringify(
          String(data.get("tags"))
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      );
      await apiFetch("/resources", { method: "POST", body: data });
      setToast({
        message: "Resource uploaded and sent for librarian approval.",
        kind: "success",
      });
      setShowForm(false);
      event.currentTarget.reset();
      await load();
    } catch (cause) {
      setToast({
        message: cause instanceof ApiError ? cause.message : "Upload failed",
        kind: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function review(id: string, approve: boolean) {
    let body: string | undefined;
    if (!approve) {
      const reason = window.prompt(
        "Give the uploader a clear reason for rejection:",
      );
      if (!reason) return;
      body = JSON.stringify({ reason });
    }
    try {
      await apiFetch(`/resources/${id}/${approve ? "approve" : "reject"}`, {
        method: "POST",
        body,
      });
      setToast({
        message: approve
          ? "Resource approved and published."
          : "Resource returned to the uploader.",
        kind: "success",
      });
      await load();
    } catch (cause) {
      setToast({
        message: cause instanceof ApiError ? cause.message : "Review failed",
        kind: "error",
      });
    }
  }

  async function showAnalytics(resourceId: string) {
    const result = await apiFetch<ResourceAnalytics>(
      `/analytics/resources/${resourceId}?days=30`,
    );
    setAnalytics(result);
  }

  return (
    <AppShell
      roles={["STAFF", "LIBRARIAN", "ADMIN"]}
      title={canReview ? "Curation queue" : "Your uploads"}
      description={
        canReview
          ? "Review metadata and release trusted resources into the catalog."
          : "Upload and manage academic material contributed to the institution."
      }
      action={
        canUpload && (
          <button className="button" onClick={() => setShowForm(!showForm)}>
            <FilePlus2 size={17} /> {showForm ? "Close form" : "New resource"}
          </button>
        )
      }
    >
      {showForm && (
        <form className="upload-form" onSubmit={upload}>
          <div className="form-heading">
            <Upload />
            <span>
              <h2>Upload a digital resource</h2>
              <p>
                PDF, DOCX or EPUB. Maximum size is configured by the
                institution.
              </p>
            </span>
          </div>
          <div className="form-two">
            <label className="form-field">
              <span>Title</span>
              <input required name="title" minLength={3} />
            </label>
            <label className="form-field">
              <span>Author or issuing body</span>
              <input required name="author" />
            </label>
          </div>
          <label className="form-field">
            <span>Abstract</span>
            <textarea
              required
              name="abstract"
              minLength={20}
              rows={5}
              placeholder="Describe the scope and key topics…"
            />
          </label>
          <div className="form-three">
            <label className="form-field">
              <span>Collection</span>
              <select required name="categoryId">
                <option value="">Choose collection</option>
                {categories
                  .flatMap((category) => [
                    category,
                    ...(category.children || []),
                  ])
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="form-field">
              <span>Resource type</span>
              <select name="resourceType" required>
                <option value="EBOOK">E-book</option>
                <option value="THESIS">Thesis</option>
                <option value="JOURNAL_ARTICLE">Journal article</option>
                <option value="PAST_QUESTION">Past question</option>
                <option value="COURSE_MATERIAL">Course material</option>
              </select>
            </label>
            <label className="form-field">
              <span>Publication year</span>
              <input
                required
                name="publicationYear"
                type="number"
                min="1400"
                max={new Date().getFullYear() + 1}
                defaultValue={new Date().getFullYear()}
              />
            </label>
          </div>
          <div className="form-two">
            <label className="form-field">
              <span>Tags, separated by commas</span>
              <input
                required
                name="tags"
                placeholder="information retrieval, machine learning"
              />
            </label>
            <label className="form-field">
              <span>Department</span>
              <input name="department" defaultValue={user?.department || ""} />
            </label>
          </div>
          <label className="file-drop">
            <input required name="file" type="file" accept=".pdf,.docx,.epub" />
            <Upload />
            <strong>Select the resource file</strong>
            <small>
              The API verifies its extension, declared MIME type, file
              signature, size and malware scan.
            </small>
          </label>
          <div className="form-actions">
            <button className="button" disabled={busy}>
              {busy ? "Scanning and uploading…" : "Upload for approval"}
            </button>
            <button
              type="button"
              className="button button-ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="management-section">
        <div className="management-head">
          <div>
            <span className="eyebrow">
              {canReview ? "Awaiting a decision" : "Submission history"}
            </span>
            <h2>
              {canReview ? "Pending resources" : "Resources you contributed"}
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={() => void load()}
            aria-label="Refresh"
          >
            <RefreshCw size={17} />
          </button>
        </div>
        {items === undefined ? (
          <div className="inline-loading">
            <span className="spinner" />
          </div>
        ) : items.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Type</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Engagement</th>
                  {canReview && <th>Decision</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((resource) => (
                  <tr key={resource.id}>
                    <td>
                      <strong>{resource.title}</strong>
                      <small>
                        {resource.author}
                        {canReview && resource.uploadedBy
                          ? ` · by ${resource.uploadedBy.name}`
                          : ""}
                      </small>
                      {resource.rejectionReason && (
                        <em>{resource.rejectionReason}</em>
                      )}
                    </td>
                    <td>{resourceTypeLabel(resource.resourceType)}</td>
                    <td>{dateLabel(resource.updatedAt)}</td>
                    <td>
                      <span
                        className={`status status-${resource.status.toLowerCase()}`}
                      >
                        {resource.status.toLowerCase()}
                      </span>
                    </td>
                    <td>
                      {resource.viewCount} views · {resource.downloadCount}{" "}
                      downloads
                      {!canReview && resource.status === "APPROVED" && (
                        <button
                          className="trend-link"
                          onClick={() => void showAnalytics(resource.id)}
                        >
                          <BarChart3 size={13} /> View trend
                        </button>
                      )}
                    </td>
                    {canReview && (
                      <td>
                        <div className="row-actions">
                          <button
                            className="approve"
                            onClick={() => void review(resource.id, true)}
                          >
                            <Check size={15} /> Approve
                          </button>
                          <button
                            className="reject"
                            onClick={() => void review(resource.id, false)}
                          >
                            <X size={15} /> Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={canReview ? "The queue is clear" : "No uploads yet"}
            message={
              canReview
                ? "New staff submissions will appear here for review."
                : "Contribute the first resource when you are ready."
            }
          />
        )}
      </section>

      {analytics && (
        <ResourceTrend
          data={analytics}
          onClose={() => setAnalytics(undefined)}
        />
      )}
      {toast && <Toast {...toast} onClose={() => setToast(undefined)} />}
    </AppShell>
  );
}

function ResourceTrend({
  data,
  onClose,
}: {
  data: ResourceAnalytics;
  onClose(): void;
}) {
  const maximum = Math.max(
    ...data.trend.flatMap((row) => [row.views, row.downloads]),
    1,
  );
  return (
    <section className="resource-trend">
      <div className="management-head">
        <div>
          <span className="eyebrow">Last 30 days</span>
          <h2>{data.resource.title}</h2>
          <p>
            {data.resource.viewCount} total views ·{" "}
            {data.resource.downloadCount} total downloads
          </p>
        </div>
        <button className="icon-button" onClick={onClose}>
          <X size={17} />
        </button>
      </div>
      {data.trend.length ? (
        <div className="mini-trend" aria-label="Daily views and downloads">
          {data.trend.map((row) => (
            <div
              key={row.day}
              title={`${new Date(row.day).toLocaleDateString()}: ${row.views} views, ${row.downloads} downloads`}
            >
              <span
                className="view-bar"
                style={{
                  height: `${Math.max(3, (row.views / maximum) * 100)}%`,
                }}
              />
              <span
                className="download-bar"
                style={{
                  height: `${Math.max(3, (row.downloads / maximum) * 100)}%`,
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">No engagement events in this period.</p>
      )}
    </section>
  );
}
