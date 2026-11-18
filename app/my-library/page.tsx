"use client";

import { ArrowDownToLine, ArrowRight, LoaderCircle, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import MyCollectionSubscriptions from "../../components/MyCollectionSubscriptions";
import type { Product } from "../../types";

type Account = { id: string; email: string };
type AuthResponse = {
  user?: Account | null;
  confirmationRequired?: boolean;
  error?: string;
};
type LibraryState = "loading" | "ready";

export default function MyLibraryPage() {
  const [user, setUser] = useState<Account | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [state, setState] = useState<LibraryState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  async function loadLibrary() {
    const response = await fetch("/api/library");
    const payload: unknown = await response.json();
    if (!response.ok || !Array.isArray(payload)) {
      throw new Error(
        typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "Could not load your library.",
      );
    }
    setProducts(payload as Product[]);
    setState("ready");
  }

  useEffect(() => {
    let active = true;
    fetch("/api/auth")
      .then(async (response) => {
        const payload = (await response.json()) as AuthResponse;
        if (!response.ok) throw new Error(payload.error ?? "Could not check your account.");
        if (!active) return;
        if (payload.user) {
          setUser(payload.user);
          setEmail(payload.user.email);
          await loadLibrary();
        } else {
          setState("ready");
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Could not check your account.");
        setState("ready");
      });
    return () => { active = false; };
  }, []);

  async function authenticate(action: "sign-in" | "sign-up"): Promise<AuthResponse> {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, email, password }),
    });
    const payload = (await response.json()) as AuthResponse;
    if (!response.ok) throw new Error(payload.error ?? "Could not authenticate your account.");
    return payload;
  }

  async function resendConfirmationCode() {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend", email }),
      });
      const payload = (await response.json()) as AuthResponse;
      if (!response.ok) throw new Error(payload.error ?? "Could not resend your verification code.");
      setNotice("A new verification code has been sent to your email.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not resend your verification code.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (confirmationRequired) {
        const response = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "confirm", email, code: confirmationCode }),
        });
        const confirmation = (await response.json()) as AuthResponse;
        if (!response.ok) throw new Error(confirmation.error ?? "Could not verify your email.");
        setConfirmationRequired(false);
        const signedIn = await authenticate("sign-in");
        if (!signedIn.user) throw new Error(signedIn.error ?? "Email verified, but sign-in did not complete.");
        setUser(signedIn.user);
        window.dispatchEvent(new Event("fynlop-auth-change"));
        await loadLibrary();
        setNotice("Your email is verified. Welcome to FYNLOP.");
        return;
      }

      const result = await authenticate(mode);
      if (result.confirmationRequired) {
        setConfirmationRequired(true);
        setNotice(
          mode === "sign-up"
            ? "Check your inbox for the verification code. If you already started signup, a new code was sent."
            : "This account needs email verification. Enter your code or request a new one below.",
        );
      } else if (result.user) {
        setUser(result.user);
        setEmail(result.user.email);
        window.dispatchEvent(new Event("fynlop-auth-change"));
        await loadLibrary();
        setNotice(mode === "sign-up" ? "Your account is ready." : "Welcome back.");
      } else {
        throw new Error("Cognito did not return an authenticated account.");
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
      const response = await fetch("/api/auth", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not sign out.");
      setUser(null);
      setProducts([]);
      window.dispatchEvent(new Event("fynlop-auth-change"));
      setNotice("You have signed out.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign out.");
    }
  }

  return (
    <main className="page-shell page-width">
      <header className="library-heading">
        <p className="eyebrow"><span className="eyebrow-mark" /> YOUR DIGITAL BOOKSHELF</p>
        <h1>My <em>library.</em></h1>
      </header>

      {state === "loading" ? (
        <div className="library-empty"><LoaderCircle className="spin" size={22} /><p>Opening your bookshelf…</p></div>
      ) : user ? (
        <section className="library-content">
          <div className="section-heading">
            <div>
              <p className="eyebrow">SIGNED IN AS {user.email.toUpperCase()}</p>
              <h2>Stories collected.</h2>
            </div>
            <button className="hero-secondary" onClick={signOut}><LogOut size={15} /> Sign out</button>
          </div>
          {error && <p className="checkout-error" role="alert">{error}</p>}
          {notice && <p className="checkout-success" role="status">{notice}</p>}
          <MyCollectionSubscriptions />
          {products.length ? (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow"><span className="eyebrow-mark" /> PREVIOUS PURCHASES</p>
                  <h2>Books you own.</h2>
                </div>
              </div>
              <div className="library-list">
                {products.map((product) => (
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
                        {downloading === product.id ? <LoaderCircle className="spin" size={16} /> : <ArrowDownToLine size={16} />}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </section>
      ) : (
        <section className="auth-layout">
          <div className="auth-panel">
            <p className="eyebrow"><span className="eyebrow-mark" /> YOUR STORIES, TO KEEP</p>
            <h2>{confirmationRequired ? "Verify your email." : mode === "sign-in" ? "Welcome back." : "Join the story."}</h2>
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
                  readOnly={confirmationRequired}
                />
              </div>
              {confirmationRequired ? (
                <div>
                  <label className="checkout-label" htmlFor="confirmation-code">Email verification code</label>
                  <input
                    className="form-control"
                    id="confirmation-code"
                    autoComplete="one-time-code"
                    required
                    value={confirmationCode}
                    onChange={(event) => setConfirmationCode(event.target.value)}
                  />
                </div>
              ) : (
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
              )}
              {error && <p className="checkout-error" role="alert">{error}</p>}
              {notice && <p className="checkout-success" role="status">{notice}</p>}
              <button className="button button-gold" type="submit" disabled={busy}>
                {busy ? "One moment…" : confirmationRequired ? "Verify and sign in" : mode === "sign-in" ? "Sign in" : "Create account"}
                {busy ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}
              </button>
              {confirmationRequired && (
                <p className="auth-switch">
                  Didn’t receive the code?{" "}
                  <button type="button" onClick={resendConfirmationCode} disabled={busy}>
                    Resend verification code
                  </button>
                </p>
              )}
            </form>
            {!confirmationRequired && (
              <p className="auth-switch">
                {mode === "sign-in" ? "New to Fynlop?" : "Already have an account?"}{" "}
                <button onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(""); setNotice(""); }}>
                  {mode === "sign-in" ? "Create an account" : "Sign in"}
                </button>
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
