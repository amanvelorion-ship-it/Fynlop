import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Zap } from "lucide-react";
import FeaturedCollections from "../components/FeaturedCollections";
import FeaturedProducts from "../components/FeaturedProducts";

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-content">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-mark" /> AN UNIVERSE OF STORIES</p>
            <h1><Image src="/FYNLOP_ LOGO.png" alt="FYNLOP" width={1500} height={480} priority /></h1>
            <p className="hero-tagline">Stories Beyond Reality</p>
            <p className="hero-description">
              Subscribe to ongoing story worlds or buy a standalone book once. Find the way you want to read.
            </p>
            <div className="hero-actions">
              <Link className="button button-gold" href="/shop">Explore the shop <ArrowUpRight aria-hidden="true" size={16} /></Link>
              <Link className="hero-secondary" href="/my-library">My library <ArrowRight aria-hidden="true" size={16} /></Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-art-image" />
            <div className="hero-art-orbit" />
            <div className="hero-art-orbit orbit-two" />
            <span className="hero-art-label">A WORLD APART</span>
          </div>
          <span className="hero-stamp" aria-hidden="true"><Zap size={28} /></span>
        </div>
        <div className="hero-foot">
          <span>INDEPENDENT WORLDS. INFINITE WONDER.</span>
          <span>SCROLL TO EXPLORE <ArrowDown size={12} /></span>
        </div>
      </section>

      <section className="page-width section" aria-labelledby="featured-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-mark" /> COLLECTION SUBSCRIPTIONS</p>
            <h2 id="featured-title">Worlds to <em>return to.</em></h2>
          </div>
          <Link className="text-link" href="/shop">Browse all collections <ArrowUpRight aria-hidden="true" size={16} /></Link>
        </div>
        <Suspense fallback={<p className="checkout-help">Loading the collection…</p>}>
          <FeaturedCollections />
        </Suspense>
      </section>

      <section className="page-width section" aria-labelledby="books-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-mark" /> ONE-TIME PURCHASES</p>
            <h2 id="books-title">Books to <em>keep.</em></h2>
          </div>
          <Link className="text-link" href="/shop">Browse all books <ArrowUpRight aria-hidden="true" size={16} /></Link>
        </div>
        <Suspense fallback={<p className="checkout-help">Loading the books…</p>}>
          <FeaturedProducts />
        </Suspense>
      </section>

      <section className="page-width about-band" id="about">
        <div>
          <p className="eyebrow"><span className="eyebrow-mark" /> THE STORY BEHIND THE STORIES</p>
          <h2>Independent voices.<br /><span>Infinite realities.</span></h2>
        </div>
        <p className="hero-description">
          Fynlop is a home for stories that take the long way around. Discover a new perspective, meet a world unlike your own, and keep the stories that stay with you.
        </p>
        <Link className="button button-gold" href="/shop">Find your next story <ArrowUpRight aria-hidden="true" size={16} /></Link>
      </section>
    </main>
  );
}
