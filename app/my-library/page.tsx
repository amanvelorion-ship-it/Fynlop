"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { products as sampleProducts } from "../../data/products";
import { createClient } from "../../lib/supabase";
import type { Product, User } from "../../types";

type LibraryState = "loading" | "ready" | "unconfigured";
const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default function MyLibraryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<Product[]>(sampleProducts);
  const [sessionToken, setSessionToken] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LibraryState>(
    supabaseConfigured ? "loading" : "unconfigured",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    supabaseConfigured
      ? ""
      : "Supabase is not configured. Add its URL and anon key to .env.local.",
  );
  const [notice, setNotice] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    fetch("/api/products")
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!response.ok || !Array.isArray(data)) {
          throw new Error(
            typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
              ? data.error
              : "Could not load the product catalog.",
          );
        }
        if (active) setCatalog(data as Product[]);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Could not load the product catalog.");
        }
      });

    async function loadPurchases(
      client: ReturnType<typeof createClient>,
      userId: string,
    ) {
      const { data, error: purchaseError } = await client
        .from("orders")
        .select("product_id")
        .eq("user_id", userId)
        .eq("status", "paid");
      if (!active) return;
      if (purchaseError) {
        setError(`Could not load your purchases: ${purchaseError.message}`);
      } else {
        setProductIds([...new Set((data ?? []).map((order) => order.product_id))]);
      }
      setState("ready");
    }

    if (supabaseConfigured) {
      void Promise.resolve()
        .then(() => createClient())
        .then(async (supabase) => {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (!active) return;
          if (sessionError) {
            setError(sessionError.message);
            setState("ready");
            return;
          }
          const session = data.session;
          if (session) {
            setUser({ id: session.user.id, email: session.user.email ?? "" });
            setEmail(session.user.email ?? "");
            setSessionToken(session.access_token);
            void loadPurchases(supabase, session.user.id);
          } else {
            setState("ready");
          }

          const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (!active) return;
            setUser(
              nextSession
                ? { id: nextSession.user.id, email: nextSession.user.email ?? "" }
                : null,
            );
            setSessionToken(nextSession?.access_token ?? "");
            setProductIds([]);
            if (nextSession) {
              void loadPurchases(supabase, nextSession.user.id);
            } else {
              setState("ready");
            }
          });
          unsubscribe = () => listener.subscription.unsubscribe();
        })
        .catch((reason: unknown) => {
          if (!active) return;
          setError(reason instanceof Error ? reason.message : "Supabase is not configured.");
          setState("unconfigured");
        });
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const supabase = createClient();
      const result =
        mode === "sign-in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (result.error) {
        throw new Error(result.error.message);
      }
      if (mode === "sign-up" && !result.data.session) {
        setNotice("Check your inbox to confirm your email and finish creating your account.");
      } else {
        setNotice(mode === "sign-up" ? "Your account is ready." : "Welcome back.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not authenticate your account.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadProduct(productId: string) {
    setDownloading(productId);
    setError("");

    try {
      const response = await fetch(`/api/download/${encodeURIComponent(productId)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const payload = (await response.json()) as { signedUrl?: string; error?: string };
      if (!response.ok || !payload.signedUrl) {
        throw new Error(payload.error ?? "Could not prepare your download.");
      }
      window.location.assign(payload.signedUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Download could not be prepared.");
    } finally {
      setDownloading(null);
    }
  }

  async function signOut() {
    try {
      const { error: signOutError } = await createClient().auth.signOut();
      if (signOutError) throw new Error(signOutError.message);
      setNotice("You have signed out.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign out.");
    }
  }

  const purchasedProducts = catalog.filter((product) => productIds.includes(product.id));

  return (
    <main className="page-shell page-width">
      <header className="library-heading">
        <p className="eyebrow"><span className="eyebrow-mark" /> YOUR DIGITAL BOOKSHELF</p>
        <h1>My <em>library.</em></h1>
      </header>

      {state === "loading" ? (
        <div className="library-empty"><p>Opening your bookshelf…</p></div>
      ) : state === "unconfigured" ? (
        <div className="library-empty">
          <h2>Accounts are not connected yet.</h2>
          <p>{error}</p>
        </div>
      ) : user ? (
        <section className="library-content">
          <div className="section-heading">
            <div>
              <p className="eyebrow">SIGNED IN AS {user.email.toUpperCase()}</p>
              <h2>Stories collected.</h2>
            </div>
            <button className="hero-secondary" onClick={signOut}>Sign out</button>
          </div>
          {error && <p className="checkout-error" role="alert">{error}</p>}
          {notice && <p className="checkout-success" role="status">{notice}</p>}
          {purchasedProducts.length ? (
            <div className="library-list">
              {purchasedProducts.map((product) => (
                <article className="library-item" key={product.id}>
                  <div
                    className="library-cover"
                    role="img"
                    aria-label={`${product.title} cover`}
                    style={{ backgroundImage: `url("${product.cover_image_url}")` }}
                  />
                  <div>
                    <h2>{product.title}</h2>
                    <p>{product.category} · by {product.author}</p>
                    <button
                      className="button button-gold"
                      onClick={() => void downloadProduct(product.id)}
                      disabled={downloading === product.id}
                    >
                      {downloading === product.id ? "Preparing download…" : "Download edition"}
                      <span aria-hidden="true">↓</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="library-empty">
              <h2>Your next favorite is waiting.</h2>
              <p>Stories you purchase will be collected here for easy access.</p>
              <Link className="button button-gold" href="/shop">Explore the shop <span aria-hidden="true">↗</span></Link>
            </div>
          )}
        </section>
      ) : (
        <section className="auth-layout">
          <div className="auth-panel">
            <p className="eyebrow"><span className="eyebrow-mark" /> YOUR STORIES, TO KEEP</p>
            <h2>{mode === "sign-in" ? "Welcome back." : "Join the story."}</h2>
            <form onSubmit={submitAuth}>
              <div>
                <label className="checkout-label" htmlFor="account-email">Email address</label>
                <input
                  className="form-control"
                  id="account-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div>
                <label className="checkout-label" htmlFor="account-password">Password</label>
                <input
                  className="form-control"
                  id="account-password"
                  type="password"
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {error && <p className="checkout-error" role="alert">{error}</p>}
              {notice && <p className="checkout-success" role="status">{notice}</p>}
              <button className="button button-gold" type="submit" disabled={busy}>
                {busy ? "One moment…" : mode === "sign-in" ? "Sign in" : "Create account"}
                <span aria-hidden="true">↗</span>
              </button>
            </form>
            <p className="auth-switch">
              {mode === "sign-in" ? "New to Fynlop?" : "Already have an account?"}{" "}
              <button onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(""); setNotice(""); }}>
                {mode === "sign-in" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
