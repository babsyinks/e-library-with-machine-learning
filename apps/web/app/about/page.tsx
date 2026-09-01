import type { Metadata } from "next";
import {
  BarChart3,
  BrainCircuit,
  Database,
  LockKeyhole,
  Search,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = { title: "How it works" };

export default function AboutPage() {
  return (
    <div className="page-shell about-page">
      <div className="page-intro">
        <span className="eyebrow">Transparent by design</span>
        <h1>
          Useful intelligence,
          <br />
          without the black box.
        </h1>
        <p>
          ScholarShelf serves one institution and uses a focused, explainable
          approach to discovery, personalization and learning analytics.
        </p>
      </div>
      <div className="about-grid">
        <article>
          <Search />
          <h2>Trusted discovery</h2>
          <p>
            Every public catalog item passes a librarian approval workflow.
            Search spans the title, author, abstract and tags, with filters for
            the details students actually know.
          </p>
        </article>
        <article>
          <BrainCircuit />
          <h2>Explainable matching</h2>
          <p>
            The recommendation service represents resource metadata with TF-IDF,
            then uses cosine similarity to identify resources that share
            meaningful terms with a learner&apos;s history.
          </p>
        </article>
        <article>
          <BarChart3 />
          <h2>Privacy-conscious insight</h2>
          <p>
            Students can see their own activity. Staff see engagement with their
            uploads. Librarians see aggregate trends—not individual student
            reading histories.
          </p>
        </article>
        <article>
          <LockKeyhole />
          <h2>Access stays controlled</h2>
          <p>
            Files never use public static links. Authenticated requests receive
            a short-lived signed URL after the API verifies the resource and
            records the permitted event.
          </p>
        </article>
      </div>
      <div className="architecture-strip">
        <span>
          <Database />
          <strong>Institutional catalog</strong>
        </span>
        <i>→</i>
        <span>
          <BrainCircuit />
          <strong>TF-IDF vectors</strong>
        </span>
        <i>→</i>
        <span>
          <ShieldCheck />
          <strong>Explainable results</strong>
        </span>
      </div>
    </div>
  );
}
