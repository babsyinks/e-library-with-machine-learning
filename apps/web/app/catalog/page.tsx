import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ResourceCard } from "@/components/resource-card";
import { catalog, publicApi } from "@/lib/api";
import { Category } from "@/lib/types";

export const metadata: Metadata = { title: "Explore the catalog" };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const input = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input))
    if (typeof value === "string" && value) params.set(key, value);
  if (!params.has("limit")) params.set("limit", "12");
  const [result, categories] = await Promise.all([
    catalog(params),
    publicApi<Category[]>("/categories").catch(() => []),
  ]);
  const currentPage = result.pagination.page;
  const pageHref = (page: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    return `/catalog?${next}`;
  };
  return (
    <div className="page-shell catalog-page">
      <div className="page-intro compact">
        <span className="eyebrow">Institutional collection</span>
        <h1>Explore the library</h1>
        <p>
          Search across approved e-books, theses, journal articles, course
          materials and examination resources.
        </p>
      </div>
      <form className="catalog-search" action="/catalog">
        <Search size={20} />
        <input
          name="q"
          defaultValue={typeof input.q === "string" ? input.q : ""}
          placeholder="Title, author, topic, tag…"
        />
        <button>Search</button>
      </form>
      <div className="catalog-layout">
        <aside className="filter-panel">
          <div className="filter-title">
            <SlidersHorizontal size={18} />
            <strong>Refine results</strong>
          </div>
          <form action="/catalog">
            {typeof input.q === "string" && (
              <input type="hidden" name="q" value={input.q} />
            )}
            <label>
              Collection
              <select
                name="categoryId"
                defaultValue={
                  typeof input.categoryId === "string" ? input.categoryId : ""
                }
              >
                <option value="">All collections</option>
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
            <label>
              Resource type
              <select
                name="resourceType"
                defaultValue={
                  typeof input.resourceType === "string"
                    ? input.resourceType
                    : ""
                }
              >
                <option value="">All formats</option>
                <option value="EBOOK">E-book</option>
                <option value="THESIS">Thesis</option>
                <option value="JOURNAL_ARTICLE">Journal article</option>
                <option value="PAST_QUESTION">Past question</option>
                <option value="COURSE_MATERIAL">Course material</option>
              </select>
            </label>
            <label>
              Publication year
              <input
                name="year"
                type="number"
                min="1400"
                max={new Date().getFullYear() + 1}
                defaultValue={typeof input.year === "string" ? input.year : ""}
                placeholder="e.g. 2025"
              />
            </label>
            <label>
              Department
              <input
                name="department"
                defaultValue={
                  typeof input.department === "string" ? input.department : ""
                }
                placeholder="e.g. Computer Science"
              />
            </label>
            <label>
              Sort by
              <select
                name="sort"
                defaultValue={
                  typeof input.sort === "string" ? input.sort : "relevance"
                }
              >
                <option value="relevance">Relevance</option>
                <option value="newest">Date added</option>
                <option value="popular">Popularity</option>
              </select>
            </label>
            <button className="button button-full">Apply filters</button>
            <Link className="clear-filter" href="/catalog">
              Clear all
            </Link>
          </form>
        </aside>
        <section className="catalog-results">
          <div className="results-bar">
            <p>
              <strong>{result.pagination.total}</strong>{" "}
              {result.pagination.total === 1 ? "resource" : "resources"} found
            </p>
            <span>
              Page {currentPage} of {Math.max(result.pagination.pages, 1)}
            </span>
          </div>
          {result.items.length ? (
            <div className="resource-grid resource-grid-three">
              {result.items.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No matching resources"
              message="Try a broader phrase or remove one of the filters."
            />
          )}
          {result.pagination.pages > 1 && (
            <nav className="pagination">
              {currentPage > 1 && (
                <Link href={pageHref(currentPage - 1)}>
                  <ChevronLeft size={17} /> Previous
                </Link>
              )}
              <span>
                {Array.from(
                  { length: result.pagination.pages },
                  (_, i) => i + 1,
                )
                  .slice(Math.max(0, currentPage - 3), currentPage + 2)
                  .map((page) => (
                    <Link
                      className={page === currentPage ? "current" : ""}
                      key={page}
                      href={pageHref(page)}
                    >
                      {page}
                    </Link>
                  ))}
              </span>
              {currentPage < result.pagination.pages && (
                <Link href={pageHref(currentPage + 1)}>
                  Next <ChevronRight size={17} />
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
