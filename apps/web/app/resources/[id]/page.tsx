"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Download,
  Eye,
  FileText,
  FolderOpen,
  GraduationCap,
  Share2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ProtectedPage } from "@/components/protected-page";
import { ResourceCard } from "@/components/resource-card";
import { Toast } from "@/components/toast";
import { apiFetch, ApiError } from "@/lib/api";
import { fileSize, resourceTypeLabel } from "@/lib/format";
import { Resource } from "@/lib/types";

export default function ResourcePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [resource, setResource] = useState<Resource>();
  const [similar, setSimilar] = useState<Resource[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [accessing, setAccessing] = useState(false);
  const load = useCallback(() => {
    Promise.all([
      apiFetch<Resource>(`/resources/${id}`),
      apiFetch<Resource[]>(`/recommendations/similar/${id}`),
    ])
      .then(([item, recs]) => {
        setResource(item);
        setSimilar(recs);
      })
      .catch((cause) =>
        setError(
          cause instanceof ApiError ? cause.message : "Resource unavailable",
        ),
      );
  }, [id]);
  useEffect(load, [load]);
  async function access(preview: boolean) {
    setAccessing(true);
    try {
      const result = await apiFetch<{ url: string }>(
        `/resources/${id}/access?preview=${preview}`,
        { method: "POST" },
      );
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (cause) {
      setToast(cause instanceof ApiError ? cause.message : "File unavailable");
    } finally {
      setAccessing(false);
    }
  }
  async function save() {
    const result = await apiFetch<{ saved: boolean }>(
      `/resources/${id}/saved`,
      { method: "POST" },
    );
    setResource((current) =>
      current ? { ...current, saved: result.saved } : current,
    );
    setToast(
      result.saved ? "Saved to your library" : "Removed from your library",
    );
  }
  async function share() {
    await navigator.clipboard.writeText(window.location.href);
    setToast("Resource link copied");
  }
  return (
    <ProtectedPage>
      {error ? (
        <div className="page-shell">
          <EmptyState title="Resource unavailable" message={error} />
        </div>
      ) : !resource ? (
        <div className="page-state">
          <span className="spinner" />
        </div>
      ) : (
        <div className="resource-page">
          <div className="resource-detail-shell">
            <button
              className="back-link button-reset"
              onClick={() => router.back()}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <div className="resource-detail">
              <aside>
                <div
                  className={`resource-cover detail-cover cover-${resource.resourceType === "JOURNAL_ARTICLE" ? "coral" : resource.resourceType === "EBOOK" ? "emerald" : "navy"}`}
                >
                  <span className="cover-type">
                    {resourceTypeLabel(resource.resourceType)}
                  </span>
                  <strong>{resource.title}</strong>
                  <span className="cover-author">{resource.author}</span>
                  <span className="cover-lines" />
                </div>
                <div className="access-actions">
                  <button
                    className="button"
                    onClick={() => void access(false)}
                    disabled={accessing || !resource.versions?.length}
                  >
                    <Download size={17} /> Download full resource
                  </button>
                  {resource.versions?.[0]?.mimeType === "application/pdf" && (
                    <button
                      className="button button-secondary"
                      onClick={() => void access(true)}
                    >
                      <Eye size={17} /> Preview PDF
                    </button>
                  )}
                  <div>
                    <button className="icon-action" onClick={() => void save()}>
                      {resource.saved ? <BookmarkCheck /> : <Bookmark />}
                      <span>{resource.saved ? "Saved" : "Save"}</span>
                    </button>
                    <button
                      className="icon-action"
                      onClick={() => void share()}
                    >
                      <Share2 />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </aside>
              <article className="resource-info">
                <span className="pill pill-green">
                  <FileText size={14} />{" "}
                  {resourceTypeLabel(resource.resourceType)}
                </span>
                <h1>{resource.title}</h1>
                <p className="detail-author">{resource.author}</p>
                <div className="detail-facts">
                  <span>
                    <FolderOpen /> <small>Collection</small>
                    <strong>{resource.category.name}</strong>
                  </span>
                  <span>
                    <Calendar /> <small>Published</small>
                    <strong>{resource.publicationYear}</strong>
                  </span>
                  <span>
                    <GraduationCap /> <small>Department</small>
                    <strong>{resource.department || "General"}</strong>
                  </span>
                  <span>
                    <Eye /> <small>Engagement</small>
                    <strong>{resource.viewCount} views</strong>
                  </span>
                </div>
                <section className="abstract">
                  <h2>About this resource</h2>
                  <p>{resource.abstract}</p>
                </section>
                <section className="tags">
                  <h3>Topics and keywords</h3>
                  <div>
                    {resource.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/catalog?q=${encodeURIComponent(tag)}`}
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                </section>
                <section className="resource-provenance">
                  <ShieldRow
                    icon={UserRound}
                    label="Uploaded by"
                    value={resource.uploadedBy?.name || "Library staff"}
                  />
                  <ShieldRow
                    icon={FileText}
                    label="Current version"
                    value={`Version ${resource.currentVersion}`}
                  />
                  {resource.versions?.[0] && (
                    <ShieldRow
                      icon={Download}
                      label="File"
                      value={`${resource.versions[0].originalName} · ${fileSize(resource.versions[0].sizeBytes)}`}
                    />
                  )}
                </section>
              </article>
            </div>
          </div>
          <section className="similar-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">
                  <Sparkles size={15} /> Item similarity
                </span>
                <h2>More like this</h2>
                <p>Resources that share meaningful topics and terms.</p>
              </div>
            </div>
            {similar.length ? (
              <div className="resource-grid">
                {similar.slice(0, 4).map((item) => (
                  <ResourceCard key={item.id} resource={item} explanation />
                ))}
              </div>
            ) : (
              <p className="muted">No similar approved resources yet.</p>
            )}
          </section>
          {toast && (
            <Toast
              message={toast}
              kind={toast.includes("unavailable") ? "error" : "success"}
              onClose={() => setToast("")}
            />
          )}
        </div>
      )}
    </ProtectedPage>
  );
}

function ShieldRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div>
      <Icon />
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}
