import Link from "next/link";
import { BookOpen } from "lucide-react";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-shell">
        <div>
          <Link className="brand brand-light" href="/">
            <span className="brand-mark">
              <BookOpen size={21} />
            </span>{" "}
            Scholar<span>Shelf</span>
          </Link>
          <p>Knowledge, made personal. Built for one academic community.</p>
        </div>
        <div className="footer-links">
          <div>
            <strong>Discover</strong>
            <Link href="/catalog">Explore catalog</Link>
            <Link href="/collections">Collections</Link>
          </div>
          <div>
            <strong>Platform</strong>
            <Link href="/about">How it works</Link>
            <Link href="/auth/login">Sign in</Link>
          </div>
          <div>
            <strong>Institution</strong>
            <span>Library services</span>
            <span>Privacy & responsible data</span>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} ScholarShelf</span>
        <span>Secure · Explainable · Institution-first</span>
      </div>
    </footer>
  );
}
