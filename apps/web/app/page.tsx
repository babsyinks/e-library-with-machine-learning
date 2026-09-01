import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookCheck,
  BrainCircuit,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ResourceCard } from "@/components/resource-card";
import { catalog } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const popular = await catalog(
    new URLSearchParams({ sort: "popular", limit: "4" }),
  );
  return (
    <>
      <section className="hero">
        <div className="hero-shell">
          <div className="hero-copy">
            <span className="pill">
              <Sparkles size={14} /> Your institution&apos;s knowledge,
              thoughtfully connected
            </span>
            <h1>
              Find the right knowledge.
              <br />
              <em>Learn with direction.</em>
            </h1>
            <p>
              Search trusted academic materials, uncover useful connections, and
              receive recommendations that become more relevant as you learn.
            </p>
            <form className="hero-search" action="/catalog">
              <Search size={21} />
              <input
                name="q"
                aria-label="Search the library"
                placeholder="Search books, theses, articles, past questions…"
              />
              <button type="submit">Search library</button>
            </form>
            <div className="hero-proof">
              <span>
                <ShieldCheck size={16} /> Institution-verified
              </span>
              <span>
                <BrainCircuit size={16} /> Explainable recommendations
              </span>
              <span>
                <BookCheck size={16} /> Librarian-approved
              </span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="book-stack book-a">
              <span>
                RESEARCH
                <br />
                METHODS
              </span>
            </div>
            <div className="book-stack book-b">
              <span>
                DATA &<br />
                SOCIETY
              </span>
            </div>
            <div className="book-stack book-c">
              <span>
                LEARNING
                <br />
                SYSTEMS
              </span>
            </div>
            <div className="recommendation-note">
              <Sparkles size={17} />
              <span>
                <small>Recommended for you</small>
                <strong>Information Retrieval</strong>
                <em>92% topic match</em>
              </span>
            </div>
          </div>
        </div>
        <div className="hero-ribbon">
          <span>e-Books</span>
          <i /> <span>Theses</span>
          <i /> <span>Journal articles</span>
          <i /> <span>Past questions</span>
          <i /> <span>Course materials</span>
        </div>
      </section>

      <section className="section section-popular">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Explore the collection</span>
            <h2>Popular in the library</h2>
            <p>Resources your academic community is reading now.</p>
          </div>
          <Link className="text-link" href="/catalog?sort=popular">
            View full catalog <ArrowRight size={17} />
          </Link>
        </div>
        {popular.items.length ? (
          <div className="resource-grid">
            {popular.items.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        ) : (
          <div className="catalog-placeholder">
            <BookCheck />
            <p>
              The catalog is ready for your institution&apos;s first approved
              resources.
            </p>
          </div>
        )}
      </section>

      <section className="section how-section">
        <div className="section-heading centered">
          <div>
            <span className="eyebrow">Designed around real study</span>
            <h2>A library that learns what helps</h2>
            <p>
              Simple discovery for students. Clear oversight for the
              institution.
            </p>
          </div>
        </div>
        <div className="feature-grid">
          <article>
            <span className="feature-number">01</span>
            <div className="feature-icon">
              <Search />
            </div>
            <h3>Search with precision</h3>
            <p>
              Find material by topic, author, department, format, year, or a
              phrase from its abstract.
            </p>
          </article>
          <article>
            <span className="feature-number">02</span>
            <div className="feature-icon">
              <BrainCircuit />
            </div>
            <h3>Discover useful connections</h3>
            <p>
              TF-IDF recommendations connect the themes in what you read to
              relevant unseen material.
            </p>
          </article>
          <article>
            <span className="feature-number">03</span>
            <div className="feature-icon">
              <BarChart3 />
            </div>
            <h3>See the bigger picture</h3>
            <p>
              Private personal summaries help learners, while aggregate trends
              guide library decisions.
            </p>
          </article>
        </div>
      </section>

      <section className="cta-section">
        <div>
          <span className="pill pill-light">
            A better path through academic knowledge
          </span>
          <h2>
            Your next useful source
            <br />
            could be one search away.
          </h2>
          <p>
            Join with your institutional email and build a library shaped by
            your learning.
          </p>
          <Link className="button button-light" href="/auth/register">
            Create your account <ArrowRight size={18} />
          </Link>
        </div>
        <div className="cta-mark" aria-hidden="true">
          <BookCheck />
        </div>
      </section>
    </>
  );
}
