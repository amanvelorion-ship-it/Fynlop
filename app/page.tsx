import Link from "next/link";
import FeaturedProducts from "../components/FeaturedProducts";

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-content">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-mark" /> AN UNIVERSE OF STORIES</p>
            <h1>FYNLOP<span>.</span></h1>
            <p className="hero-tagline">Stories Beyond Reality</p>
            <p className="hero-description">
              Step into a universe of bold comics and books, imagined by independent creators and made for curious minds.
            </p>
            <div className="hero-actions">
              <Link className="button button-gold" href="/shop?category=Comics">Explore comics <span aria-hidden="true">↗</span></Link>
              <Link className="hero-secondary" href="/shop?category=Books">Browse books <span aria-hidden="true">→</span></Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-art-image" />
            <div className="hero-art-orbit" />
            <div className="hero-art-orbit orbit-two" />
            <span className="hero-art-label">A WORLD APART</span>
          </div>
          <span className="hero-stamp" aria-hidden="true">✳</span>
        </div>
        <div className="hero-foot">
          <span>INDEPENDENT WORLDS. INFINITE WONDER.</span>
          <span>SCROLL TO EXPLORE ↓</span>
        </div>
      </section>

      <section className="page-width section" aria-labelledby="featured-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-mark" /> THE FYNLOP EDIT</p>
            <h2 id="featured-title">Worlds to <em>get lost in.</em></h2>
          </div>
          <Link className="text-link" href="/shop">Explore the collection <span aria-hidden="true">↗</span></Link>
        </div>
        <FeaturedProducts />
      </section>

      <section className="page-width about-band" id="about">
        <div>
          <p className="eyebrow"><span className="eyebrow-mark" /> THE STORY BEHIND THE STORIES</p>
          <h2>Independent voices.<br /><span>Infinite realities.</span></h2>
        </div>
        <p className="hero-description">
          Fynlop is a home for stories that take the long way around. Discover a new perspective, meet a world unlike your own, and keep the stories that stay with you.
        </p>
        <Link className="button button-gold" href="/shop">Find your next story <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  );
}
