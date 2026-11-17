"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, ShoppingCart, X } from "lucide-react";
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
          <Image src="/FYNLOP_ LOGO.png" alt="FYNLOP" width={180} height={72} priority />
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
            <ShoppingCart aria-hidden="true" size={21} strokeWidth={1.6} />
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </Link>
          <Link className="nav-account" href="/my-library">Sign in <ArrowUpRight aria-hidden="true" size={14} /></Link>
          <button
            className={`menu-toggle${menuOpen ? " menu-active" : ""}`}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
