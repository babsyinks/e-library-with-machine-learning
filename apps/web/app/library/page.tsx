"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { ResourceCard } from "@/components/resource-card";
import { apiFetch } from "@/lib/api";
import { Resource } from "@/lib/types";

export default function LibraryPage() {
  const [items, setItems] = useState<Resource[]>();
  useEffect(() => {
    apiFetch<Resource[]>("/resources/saved").then(setItems);
  }, []);
  return (
    <AppShell
      title="Your saved library"
      description="A focused shelf for sources you want to return to."
      action={
        <Link className="button" href="/catalog">
          <Search size={17} /> Find resources
        </Link>
      }
    >
      {!items ? (
        <div className="inline-loading">
          <span className="spinner" />
        </div>
      ) : items.length ? (
        <div className="resource-grid resource-grid-three">
          {items.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Your shelf is ready"
          message="Save useful catalog resources and they will stay collected here."
        />
      )}
    </AppShell>
  );
}
