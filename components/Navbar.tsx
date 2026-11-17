"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readCart, subscribeToCart } from "../lib/cart";

export default function Navbar() {
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateCart = () => setCartCount(readCart().length);
    const updateScroll = () => setScrolled(window.scrollY > 24);
    updateCart();
    updateScroll();
    const unsubscribe = subscribeToCart(updateCart);
    window.addEventListener("scroll", updateScroll, { passive: true });

    return () => {
      unsubscribe();
      window.removeEventListener("scroll", updateScroll);
    };
  }, []);

  const links = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/#about", label: "About" },
  ];

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="nav-inner">
        <Link className="brand" href="/" aria-label="Fynlop home">
          <span className="brand-bolt" aria-hidden="true">ϟ</span>
          <span>FYNLOP<span className="brand-period">.</span></span>
        </Link>
        <nav className={`nav-links${menuOpen ? " nav-open" : ""}`} aria-label="Main navigation">
          {links.map((link) => (
            <Link href={link.href} key={link.label} onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link className="mobile-nav-link" href="/my-library" onClick={() => setMenuOpen(false)}>My library</Link>
        </nav>
        <div className="nav-actions">
          <Link className="nav-library" href="/my-library">My library</Link>
          <Link
            className="cart-link"
            href="/checkout"
            aria-label={`Cart with ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3.5 4.5h2l2.2 11.2h10.8l2-8H6.5M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
            </svg>
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </Link>
          <Link className="nav-account" href="/my-library">Sign in <span aria-hidden="true">↗</span></Link>
          <button
            className={`menu-toggle${menuOpen ? " menu-active" : ""}`}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span /><span />
          </button>
        </div>
      </div>
    </header>
  );
}
