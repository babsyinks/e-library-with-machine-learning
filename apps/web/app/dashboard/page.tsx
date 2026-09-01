"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Download,
  Eye,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { ResourceCard } from "@/components/resource-card";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";
import { Resource } from "@/lib/types";

interface Personal {
  summary: { views: number; downloads: number; saved: number };
  recent: Array<
    Pick<Resource, "id" | "title" | "author" | "resourceType"> & {
      lastAccessedAt: string;
    }
  >;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [personal, setPersonal] = useState<Personal>();
  const [recommended, setRecommended] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      apiFetch<Personal>("/analytics/me"),
      apiFetch<Resource[]>("/recommendations/for-me"),
    ])
      .then(([activity, resources]) => {
        setPersonal(activity);
        setRecommended(resources);
      })
      .finally(() => setLoading(false));
  }, []);
  const firstName = user?.name.split(" ")[0] || "there";
  return (
    <AppShell
      title={`Welcome back, ${firstName}`}
      description="Pick up where you left off or follow a new thread through the collection."
      action={
        <Link className="button" href="/catalog">
          <Search size={17} /> Search catalog
        </Link>
      }
    >
      {loading ? (
        <div className="inline-loading">
          <span className="spinner" /> Building your workspace…
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard
              icon={Eye}
              label="Resources viewed"
              value={personal?.summary.views || 0}
              hint="Your private history"
            />
            <StatCard
              icon={Download}
              label="Downloads"
              value={personal?.summary.downloads || 0}
              tone="coral"
            />
            <StatCard
              icon={Bookmark}
              label="Saved resources"
              value={personal?.summary.saved || 0}
              tone="gold"
            />
          </div>
          <section className="app-section">
            <div className="app-section-head">
              <div>
                <span className="section-kicker">
                  <Sparkles size={15} /> Based on your learning
                </span>
                <h2>Recommended for you</h2>
              </div>
              <Link href="/catalog">
                Explore more <ArrowRight size={16} />
              </Link>
            </div>
            {recommended.length ? (
              <div className="resource-grid resource-grid-three">
                {recommended.slice(0, 6).map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    explanation
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Your recommendations are warming up"
                message="View or download a few resources and this space will adapt to the topics you use."
              />
            )}
          </section>
          <section className="app-section recent-section">
            <div className="app-section-head">
              <div>
                <span className="eyebrow">Continue learning</span>
                <h2>Recently viewed</h2>
              </div>
            </div>
            {personal?.recent.length ? (
              <div className="recent-list">
                {personal.recent.map((resource) => (
                  <Link href={`/resources/${resource.id}`} key={resource.id}>
                    <span className="mini-cover">
                      {resource.resourceType[0]}
                    </span>
                    <span>
                      <strong>{resource.title}</strong>
                      <small>{resource.author}</small>
                    </span>
                    <ArrowRight size={17} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted">Resources you open will appear here.</p>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
