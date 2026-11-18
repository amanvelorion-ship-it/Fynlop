"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, ShoppingBag, X } from "lucide-react";
import { readCart, subscribeToCart } from "../lib/cart";

type AuthResponse = { user?: { id: string; email: string } | null; error?: string };

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accountStatus, setAccountStatus] = useState<"checking" | "signed-in" | "signed-out">("checking");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let active = true;
    let authRequest = 0;
    const updateScroll = () => setScrolled(window.scrollY > 24);
    const updateAuth = async () => {
      const requestId = ++authRequest;
      try {
        const response = await fetch("/api/auth", { cache: "no-store" });
        const payload = (await response.json()) as AuthResponse;
        if (!response.ok) throw new Error(payload.error ?? "Could not check your account.");
        if (active && requestId === authRequest) {
          setAccountStatus(payload.user ? "signed-in" : "signed-out");
        }
      } catch (error) {
        if (active && requestId === authRequest) {
          console.error("Could not refresh the navbar account state:", error);
        }
      }
    };
    const handleAuthChange = () => { void updateAuth(); };
    const updateCart = () => setCartCount(readCart().length);

    updateScroll();
    void updateAuth();
    updateCart();
    const unsubscribeCart = subscribeToCart(updateCart);
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("fynlop-auth-change", handleAuthChange);

    return () => {
      active = false;
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("fynlop-auth-change", handleAuthChange);
      unsubscribeCart();
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
          <Link className="cart-link" href="/checkout" aria-label={`Cart with ${cartCount} books`}>
            <ShoppingBag aria-hidden="true" />
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </Link>
          <Link className="nav-library" href="/my-library">My library</Link>
          <Link className="nav-account" href="/my-library">
            {accountStatus === "signed-out" ? "Sign in" : "Account"}
            <ArrowUpRight aria-hidden="true" size={14} />
          </Link>
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
