import Link from "next/link";
import { ArrowUpRight, Download, Eye } from "lucide-react";
import { Resource } from "@/lib/types";
import { resourceTypeLabel } from "@/lib/format";

const coverClass: Record<string, string> = {
  EBOOK: "cover-emerald",
  THESIS: "cover-navy",
  JOURNAL_ARTICLE: "cover-coral",
  PAST_QUESTION: "cover-gold",
  COURSE_MATERIAL: "cover-sky",
};

export function ResourceCard({
  resource,
  explanation,
}: {
  resource: Resource;
  explanation?: boolean;
}) {
  return (
    <article className="resource-card">
      <Link
        className={`resource-cover ${coverClass[resource.resourceType] || "cover-navy"}`}
        href={`/resources/${resource.id}`}
      >
        <span className="cover-type">
          {resourceTypeLabel(resource.resourceType)}
        </span>
        <strong>{resource.title}</strong>
        <span className="cover-author">{resource.author}</span>
        <span className="cover-lines" />
      </Link>
      <div className="resource-body">
        <span className="eyebrow">
          {resource.category?.name || "Academic resource"}
        </span>
        <h3>
          <Link href={`/resources/${resource.id}`}>{resource.title}</Link>
        </h3>
        <p className="author-line">
          {resource.author} · {resource.publicationYear}
        </p>
        {explanation && resource.recommendationExplanation && (
          <p className="why-this">{resource.recommendationExplanation}</p>
        )}
        <div className="card-meta">
          <span>
            <Eye size={14} /> {resource.viewCount}
          </span>
          <span>
            <Download size={14} /> {resource.downloadCount}
          </span>
          <Link
            href={`/resources/${resource.id}`}
            aria-label={`Open ${resource.title}`}
          >
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
