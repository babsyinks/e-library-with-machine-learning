import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BookCopy,
  Building2,
  FileQuestion,
  GraduationCap,
  Microscope,
  ScrollText,
} from "lucide-react";
import { publicApi } from "@/lib/api";
import { Category } from "@/lib/types";

export const metadata: Metadata = { title: "Collections" };
export const dynamic = "force-dynamic";
const icons = [
  Microscope,
  GraduationCap,
  Building2,
  ScrollText,
  BookCopy,
  FileQuestion,
];

export default async function CollectionsPage() {
  const categories = await publicApi<Category[]>("/categories").catch(() => []);
  return (
    <div className="page-shell">
      <div className="page-intro">
        <span className="eyebrow">Browse by subject</span>
        <h1>Collections shaped around your institution</h1>
        <p>
          Move from a broad field into the subjects, formats and resources most
          useful to your work.
        </p>
      </div>
      <div className="collection-grid">
        {categories.map((category, index) => {
          const Icon = icons[index % icons.length];
          return (
            <Link href={`/catalog?categoryId=${category.id}`} key={category.id}>
              <span className="collection-icon">
                <Icon />
              </span>
              <span>
                <strong>{category.name}</strong>
                <small>{category._count?.resources || 0} resources</small>
              </span>
              <ArrowUpRight />
            </Link>
          );
        })}
        {!categories.length && (
          <p className="muted">
            Collections will appear after the database is seeded.
          </p>
        )}
      </div>
    </div>
  );
}
