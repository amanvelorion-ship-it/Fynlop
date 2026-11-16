"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent, CSSProperties, FormEvent, ReactNode } from "react";

type Comic = {
  id: number;
  title: string;
  subtitle: string;
  author: string;
  price: number;
  category: string;
  color: string;
  accent: string;
  art: string;
  description: string;
  pages: number;
  featured?: boolean;
};

const initialComics: Comic[] = [
  {
    id: 1,
    title: "THE LAST LIGHT",
    subtitle: "A story from the edge of everything",
    author: "Mara Sol",
    price: 8.99,
    category: "Sci-fi",
    color: "#f1b85c",
    accent: "#252332",
    art: "sun",
    description:
      "When the sun begins to go quiet, one unlikely signal keeper sets out to find the last spark of a world worth saving. A tender, big-hearted adventure about beginnings, endings, and the light we leave for each other.",
    pages: 48,
    featured: true,
  },
  {
    id: 2,
    title: "MOSS & MOON",
    subtitle: "A little magic after dark",
    author: "Ivy Wren",
    price: 6.5,
    category: "Fantasy",
    color: "#b1c9a0",
    accent: "#233b37",
    art: "moon",
    description:
      "Deep in an overgrown city garden, a tiny witch and a very old fox discover that the moon has gone missing. A cozy fantasy for anyone who has ever taken the long way home.",
    pages: 36,
    featured: true,
  },
  {
    id: 3,
    title: "NEON SAINTS",
    subtitle: "Nobody saves the city alone",
    author: "Ren Ito",
    price: 9.0,
    category: "Action",
    color: "#e76e68",
    accent: "#25205b",
    art: "neon",
    description:
      "In a city that never sleeps, a crew of small-time heroes takes on a job that is way bigger than them. Fast, bright, and full of heart.",
    pages: 52,
    featured: true,
  },
  {
    id: 4,
    title: "TINY UNIVERSES",
    subtitle: "Small moments, enormous feelings",
    author: "Jo Park",
    price: 5.0,
    category: "Slice of life",
    color: "#efaaa2",
    accent: "#574354",
    art: "stars",
    description:
      "A quiet collection of short stories about friendships, growing up, and the universes tucked inside ordinary days.",
    pages: 32,
  },
  {
    id: 5,
    title: "WILDWOOD FM",
    subtitle: "Broadcasting from somewhere green",
    author: "Ash Rowan",
    price: 7.25,
    category: "Fantasy",
    color: "#d3b479",
    accent: "#34473c",
    art: "forest",
    description:
      "A late-night radio host starts receiving requests from a forest that shouldn't exist. Tune in for a strange, warm tale of finding your frequency.",
    pages: 42,
  },
  {
    id: 6,
    title: "ORBITAL TEA CLUB",
    subtitle: "Good company, zero gravity",
    author: "Niko Bell",
    price: 6.99,
    category: "Sci-fi",
    color: "#b6c8dd",
    accent: "#344156",
    art: "orbit",
    description:
      "The crew of a tiny space station keeps the universe at bay one cup of tea at a time. A soft sci-fi comic about making a home wherever you land.",
    pages: 40,
  },
];

const categories = ["All stories", "Fantasy", "Sci-fi", "Action", "Slice of life"];

function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={diagonal ? "arrow-icon arrow-diagonal" : "arrow-icon"}
      viewBox="0 0 20 20"
      fill="none"
    >
      <path d="M3.5 10h12m-5-5 5 5-5 5" />
    </svg>
  );
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      f
    </span>
  );
}

function ComicCover({ comic, large = false }: { comic: Comic; large?: boolean }) {
  return (
    <div
      className={`comic-cover art-${comic.art}${large ? " cover-large" : ""}`}
      style={
        {
          "--cover-color": comic.color,
          "--cover-accent": comic.accent,
        } as CSSProperties
      }
      aria-label={`${comic.title} cover artwork`}
      role="img"
    >
      <div className="cover-topline">
        <span>FYNLOP ORIGINAL</span>
        <span>NO. 01</span>
      </div>
      <div className="cover-illustration" aria-hidden="true">
        {comic.art === "sun" && (
          <>
            <span className="sun-halo" />
            <span className="sun-core" />
            <span className="sun-horizon" />
            <span className="sun-person" />
          </>
        )}
        {comic.art === "moon" && (
          <>
            <span className="moon-orb" />
            <span className="moon-leaf leaf-one" />
            <span className="moon-leaf leaf-two" />
            <span className="moon-hill" />
          </>
        )}
        {comic.art === "neon" && (
          <>
            <span className="neon-ring ring-one" />
            <span className="neon-ring ring-two" />
            <span className="neon-star">✳</span>
          </>
        )}
        {comic.art === "stars" && (
          <>
            <span className="star-field">✳　✦</span>
            <span className="star-orb" />
            <span className="star-field star-field-bottom">·　✧　·</span>
          </>
        )}
        {comic.art === "forest" && (
          <>
            <span className="forest-moon" />
            <span className="forest-tree tree-one" />
            <span className="forest-tree tree-two" />
            <span className="forest-tree tree-three" />
          </>
        )}
        {comic.art === "orbit" && (
          <>
            <span className="orbit-planet" />
            <span className="orbit-ring" />
            <span className="orbit-cup">✦</span>
          </>
        )}
        {comic.art === "custom" && <span className="custom-art">✳</span>}
      </div>
      <div className="cover-title-wrap">
        <p className="cover-eyebrow">{comic.category} · {comic.pages} pages</p>
        <h3>{comic.title}</h3>
        <p className="cover-subtitle">{comic.subtitle}</p>
      </div>
      <span className="cover-issue">A FYNLOP STORY</span>
    </div>
  );
}

function ComicCard({
  comic,
  onSelect,
}: {
  comic: Comic;
  onSelect: (comic: Comic) => void;
}) {
  return (
    <article className="comic-card">
      <button
        className="cover-button"
        onClick={() => onSelect(comic)}
        aria-label={`View ${comic.title}`}
      >
        <ComicCover comic={comic} />
        <span className="cover-open">View story <ArrowIcon diagonal /></span>
      </button>
      <div className="comic-card-info">
        <div>
          <p className="comic-card-category">{comic.category} <span>·</span> {comic.pages} pages</p>
          <h3>{comic.title}</h3>
          <p className="comic-byline">by {comic.author}</p>
        </div>
        <span className="comic-price">${comic.price.toFixed(2)}</span>
      </div>
      <button className="card-buy-button" onClick={() => onSelect(comic)}>
        Explore comic <ArrowIcon />
      </button>
    </article>
  );
}

function Modal({
  onClose,
  children,
  label,
}: {
  onClose: () => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close dialog">
          ×
        </button>
        {children}
      </section>
    </div>
  );
}

export default function Storefront() {
  const [view, setView] = useState("home");
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [comics, setComics] = useState(initialComics);
  const [category, setCategory] = useState("All stories");
  const [search, setSearch] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [library, setLibrary] = useState<number[]>([2]);
  const [readingComic, setReadingComic] = useState<Comic | null>(null);
  const [notice, setNotice] = useState("");
  const [coverName, setCoverName] = useState("");
  const [adminTitle, setAdminTitle] = useState("");
  const [adminPrice, setAdminPrice] = useState("");
  const [adminDescription, setAdminDescription] = useState("");

  const filteredComics = useMemo(
    () =>
      comics.filter((comic) => {
        const matchesCategory = category === "All stories" || comic.category === category;
        const matchesSearch = `${comic.title} ${comic.author} ${comic.category}`
          .toLowerCase()
          .includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
      }),
    [category, comics, search],
  );

  function navigate(nextView: string) {
    setView(nextView);
    setSelectedComic(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  }

  function buyComic(comic: Comic) {
    if (!library.includes(comic.id)) {
      setLibrary((current) => [...current, comic.id]);
    }
    setSelectedComic(null);
    navigate("library");
    showNotice(`${comic.title} is in your library. Demo checkout only.`);
  }

  function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignedIn(true);
    setAuthOpen(false);
    showNotice("You’re signed in to your demo account.");
  }

  function selectCover(event: ChangeEvent<HTMLInputElement>) {
    setCoverName(event.target.files?.[0]?.name ?? "");
  }

  function publishComic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newComic: Comic = {
      id: Date.now(),
      title: adminTitle.trim().toUpperCase(),
      subtitle: "A brand-new story from the studio",
      author: "Fynlop creator",
      price: Number(adminPrice),
      category: "Fantasy",
      color: "#c5b7df",
      accent: "#3d3155",
      art: "custom",
      description: adminDescription.trim(),
      pages: 24,
    };
    setComics((current) => [newComic, ...current]);
    setAdminTitle("");
    setAdminPrice("");
    setAdminDescription("");
    setCoverName("");
    navigate("store");
    showNotice("Your comic was added to this preview store.");
  }

  const libraryComics = comics.filter((comic) => library.includes(comic.id));

  return (
    <main className="site-shell">
      <header className="site-header">
        <button className="brand" onClick={() => navigate("home")} aria-label="Fynlop home">
          <BrandMark />
          <span>fynlop<span className="brand-dot">.</span></span>
        </button>
        <nav className="desktop-nav" aria-label="Main navigation">
          <button className={view === "home" ? "nav-link active" : "nav-link"} onClick={() => navigate("home")}>Home</button>
          <button className={view === "store" || selectedComic ? "nav-link active" : "nav-link"} onClick={() => navigate("store")}>Browse comics</button>
          <button className={view === "library" ? "nav-link active" : "nav-link"} onClick={() => navigate("library")}>My library</button>
        </nav>
        <div className="header-actions">
          <button className="studio-link" onClick={() => navigate("studio")}>
            <span className="studio-spark">✳</span> Creator studio
          </button>
          {signedIn ? (
            <button className="avatar-button" onClick={() => navigate("library")} aria-label="Open your library">
              {email.charAt(0).toUpperCase() || "A"}
            </button>
          ) : (
            <button className="sign-in-button" onClick={() => { setAuthMode("login"); setAuthOpen(true); }}>Sign in</button>
          )}
        </div>
      </header>

      {selectedComic ? (
        <section className="detail-page page-width">
          <button className="back-link" onClick={() => setSelectedComic(null)}>← <span>Back to comics</span></button>
          <div className="detail-layout">
            <div className="detail-cover-wrap"><ComicCover comic={selectedComic} large /></div>
            <div className="detail-copy">
              <p className="eyebrow">{selectedComic.category} <span>·</span> Digital edition</p>
              <h1>{selectedComic.title}</h1>
              <p className="detail-subtitle">{selectedComic.subtitle}</p>
              <p className="detail-byline">A comic by <strong>{selectedComic.author}</strong></p>
              <p className="detail-description">{selectedComic.description}</p>
              <div className="detail-facts">
                <span><strong>{selectedComic.pages}</strong> illustrated pages</span>
                <span><strong>PDF</strong> instant access</span>
              </div>
              <div className="detail-purchase">
                <span className="detail-price">${selectedComic.price.toFixed(2)} <small>USD</small></span>
                <button className="button button-lime button-wide" onClick={() => buyComic(selectedComic)}>
                  {library.includes(selectedComic.id) ? "Open in my library" : "Buy this comic"} <ArrowIcon />
                </button>
              </div>
              <p className="demo-caption">Checkout is a frontend preview. No payment is processed.</p>
              <div className="creator-note"><span className="creator-avatar">{selectedComic.author.charAt(0)}</span><span>Made with care by <strong>{selectedComic.author}</strong></span><span className="verified">✳</span></div>
            </div>
          </div>
        </section>
      ) : view === "home" ? (
        <>
          <section className="hero">
            <div className="hero-grain" aria-hidden="true" />
            <div className="hero-copy">
              <p className="hero-kicker"><span className="kicker-line" /> A little independent comic shop</p>
              <h1>Stories worth<br />staying up <span>for.</span></h1>
              <p className="hero-description">Discover your next favorite comic, made by independent artists and collected in one little corner of the internet.</p>
              <div className="hero-actions">
                <button className="button button-lime" onClick={() => navigate("store")}>Browse the store <ArrowIcon /></button>
                <button className="text-button" onClick={() => navigate("store")}>Meet the stories <span>↓</span></button>
              </div>
              <div className="hero-footnote"><span className="tiny-spark">✳</span> Independent comics. Instant forever.</div>
            </div>
            <div className="hero-art">
              <div className="hero-art-orbit orbit-a" />
              <div className="hero-art-orbit orbit-b" />
              <span className="hero-star hero-star-a">✳</span><span className="hero-star hero-star-b">✦</span>
              <div className="hero-feature-card">
                <ComicCover comic={comics[0]} />
                <div className="floating-label"><span className="label-dot" /> THE WEEKEND PICK</div>
              </div>
              <div className="hero-side-note">Issue 01<br /><span>Make room<br />for wonder.</span></div>
              <div className="hero-sticker">READ<br />SOMETHING<br /><b>REAL</b></div>
            </div>
            <div className="hero-bottom">
              <span>Independent voices, unforgettable worlds</span>
              <span>SCROLL TO EXPLORE <span className="scroll-arrow">↓</span></span>
            </div>
          </section>
          <section className="featured-section page-width">
            <div className="section-heading">
              <div><p className="eyebrow">THE GOOD STUFF</p><h2>Pick your next <em>escape.</em></h2></div>
              <button className="view-all" onClick={() => navigate("store")}>All comics <ArrowIcon /></button>
            </div>
            <div className="comic-grid">
              {comics.filter((comic) => comic.featured).slice(0, 3).map((comic) => (
                <ComicCard key={comic.id} comic={comic} onSelect={setSelectedComic} />
              ))}
            </div>
          </section>
          <section className="note-banner">
            <span className="note-star">✳</span>
            <p>Made by real people, for people who love a good story.</p>
            <button onClick={() => navigate("store")}>Find your next favorite <ArrowIcon /></button>
          </section>
          <section className="how-section page-width">
            <div><p className="eyebrow">A SMALL SHOP WITH BIG WORLDS</p><h2>Good stories.<br /><em>Yours to keep.</em></h2></div>
            <div className="how-steps">
              <div><span>01</span><h3>Find a story</h3><p>Browse original comics from independent creators.</p></div>
              <div><span>02</span><h3>Make it yours</h3><p>Pick up a digital edition and keep it in your library.</p></div>
              <div><span>03</span><h3>Read anywhere</h3><p>Your next favorite world is always a few pages away.</p></div>
            </div>
          </section>
        </>
      ) : view === "store" ? (
        <section className="store-page page-width">
          <div className="store-intro">
            <p className="eyebrow">THE FYNLOP COMIC SHOP</p>
            <h1>Find a story<br /><em>to fall into.</em></h1>
            <p>Hand-picked comics from independent creators. Yours to keep, page after page.</p>
          </div>
          <div className="store-toolbar">
            <div className="category-tabs" role="group" aria-label="Filter by genre">
              {categories.map((item) => <button key={item} className={category === item ? "category-tab selected" : "category-tab"} onClick={() => setCategory(item)}>{item}</button>)}
            </div>
            <label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a comic..." aria-label="Search comics" /><kbd>⌘ K</kbd></label>
          </div>
          {filteredComics.length ? (
            <div className="comic-grid store-grid">{filteredComics.map((comic) => <ComicCard key={comic.id} comic={comic} onSelect={setSelectedComic} />)}</div>
          ) : <div className="empty-search"><span>✳</span><h2>No stories found.</h2><p>Try another title or genre.</p></div>}
          <p className="store-footnote">All stories are digital editions, delivered to your library after checkout.</p>
        </section>
      ) : view === "library" ? (
        <section className="library-page page-width">
          <div className="library-welcome">
            <p className="eyebrow">YOUR LITTLE BOOKSHELF</p>
            <h1>Hey{signedIn && email ? `, ${email.split("@")[0]}` : " there"}.</h1>
            <p>Every story you pick up lives here. Ready when you are.</p>
          </div>
          <div className="library-summary"><span><strong>{libraryComics.length.toString().padStart(2, "0")}</strong> STORIES COLLECTED</span><span>YOUR DIGITAL BOOKSHELF <span className="tiny-spark">✳</span></span></div>
          {libraryComics.length ? <div className="library-grid">{libraryComics.map((comic) => <article className="library-card" key={comic.id}>
            <div className="library-cover"><ComicCover comic={comic} /></div>
            <div className="library-card-copy"><p className="eyebrow">{comic.category} · {comic.pages} pages</p><h2>{comic.title}</h2><p>by {comic.author}</p><button className="button button-dark" onClick={() => setReadingComic(comic)}>Read your comic <ArrowIcon /></button></div>
          </article>)}</div> : <div className="library-empty"><span className="empty-book">✳</span><h2>Your next favorite is out there.</h2><p>Pick a comic from the shop and it’ll be waiting here.</p><button className="button button-dark" onClick={() => navigate("store")}>Browse comics <ArrowIcon /></button></div>}
          <div className="library-more"><span>THE STORY DOESN’T END HERE</span><button onClick={() => navigate("store")}>Explore more comics <ArrowIcon /></button></div>
        </section>
      ) : (
        <section className="studio-page page-width">
          <div className="studio-heading"><div><p className="eyebrow">A SPACE FOR STORYTELLERS</p><h1>Your work.<br /><em>Out in the world.</em></h1><p>Upload a comic and make it part of the Fynlop shelves.</p></div><div className="studio-illustration"><span>✳</span><small>MADE BY YOU<br />READ BY EVERYONE</small></div></div>
          <form className="studio-form" onSubmit={publishComic}>
            <div className="studio-form-heading"><span>01 / NEW COMIC</span><h2>Let’s add a story.</h2><p>Give your comic a little introduction before sending it out into the world.</p></div>
            <div className="form-grid">
              <label>Comic title<input required maxLength={60} value={adminTitle} onChange={(event) => setAdminTitle(event.target.value)} placeholder="The name of your story" /></label>
              <label>Price (USD)<div className="price-input"><span>$</span><input required type="number" min="0.5" max="99" step="0.01" value={adminPrice} onChange={(event) => setAdminPrice(event.target.value)} placeholder="8.99" /></div></label>
              <label className="wide-field">A little about it<textarea required maxLength={500} value={adminDescription} onChange={(event) => setAdminDescription(event.target.value)} placeholder="What should readers know before they turn the first page?" rows={4} /></label>
              <label className="upload-field">Cover art <span className="upload-control">{coverName ? `✓ ${coverName}` : "＋ Choose an image"}<input type="file" accept="image/*" onChange={selectCover} /></span><small>Image selection is a local preview only.</small></label>
            </div>
            <div className="studio-submit"><p><span>✳</span> Frontend demo — publishing only adds this comic to the preview store.</p><button className="button button-lime" type="submit">Add to preview store <ArrowIcon /></button></div>
          </form>
        </section>
      )}

      <footer className="site-footer">
        <div className="footer-main">
          <button className="brand footer-brand" onClick={() => navigate("home")}><BrandMark /><span>fynlop<span className="brand-dot">.</span></span></button>
          <p>A little corner for stories<br />that stay with you.</p>
          <div className="footer-links"><button onClick={() => navigate("store")}>The shop</button><button onClick={() => navigate("library")}>Your library</button><button onClick={() => navigate("studio")}>Creator studio</button></div>
          <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>BACK TO TOP ↑</button>
        </div>
        <div className="footer-bottom"><span>© 2025 FYNLOP COMICS</span><span>INDEPENDENT STORIES, ALWAYS.</span><span>MADE WITH <b>♥</b> FOR READERS</span></div>
      </footer>

      {authOpen && <Modal onClose={() => setAuthOpen(false)} label={authMode === "signup" ? "Create your account" : "Sign in"}>
        <div className="auth-content"><BrandMark /><p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h2>{authMode === "signup" ? "Make room for stories." : "Welcome back."}</h2><p className="auth-description">Save your favorite comics and keep your little library close.</p>
          <button className="google-button" onClick={() => showNotice("Google sign-in is a frontend preview.")}><span className="google-g">G</span> Continue with Google</button>
          <div className="auth-divider"><span /> OR WITH EMAIL <span /></div>
          <form onSubmit={submitAuth} className="auth-form"><label>Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Password<input required type="password" minLength={6} autoComplete={authMode === "signup" ? "new-password" : "current-password"} placeholder="At least 6 characters" /></label><button className="button button-dark auth-submit" type="submit">{authMode === "signup" ? "Create your account" : "Sign in"} <ArrowIcon /></button></form>
          <p className="auth-switch">{authMode === "signup" ? "Already have an account?" : "New to Fynlop?"} <button onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}>{authMode === "signup" ? "Sign in" : "Create an account"}</button></p><p className="auth-demo-note">Demo only — no account details are saved or sent.</p>
        </div>
      </Modal>}

      {readingComic && <Modal onClose={() => setReadingComic(null)} label={`Read ${readingComic.title}`}><div className="reader-content"><p className="eyebrow">YOUR LIBRARY · DIGITAL EDITION</p><h2>{readingComic.title}</h2><p>by {readingComic.author}</p><div className={`reader-page reader-${readingComic.art}`}><span>FYNLOP ORIGINAL</span><div>✳</div><h3>{readingComic.title}</h3><p>{readingComic.subtitle}</p><small>PREVIEW · PAGE 01 OF {readingComic.pages}</small></div><p className="reader-caption">You’re looking at a sample reader preview. Full comic reading will be connected later.</p><button className="button button-dark reader-close" onClick={() => setReadingComic(null)}>Back to my library</button></div></Modal>}

      {notice && <div className="toast" role="status"><span>✳</span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification">×</button></div>}
    </main>
  );
}
