import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div>
          <Link className="brand footer-brand" href="/">
            <span className="brand-bolt" aria-hidden="true">ϟ</span>
            <span>FYNLOP<span className="brand-period">.</span></span>
          </Link>
          <p>Stories Beyond Reality.<br />Worlds worth getting lost in.</p>
        </div>
        <div className="footer-links">
          <span className="footer-label">DISCOVER</span>
          <Link href="/shop">Shop all stories</Link>
          <Link href="/#about">About Fynlop</Link>
          <Link href="/my-library">My library</Link>
        </div>
        <div className="footer-links">
          <span className="footer-label">HERE TO HELP</span>
          <a href="mailto:hello@fynlop.com">Contact</a>
          <Link href="/refund-policy">Refund policy</Link>
          <Link href="/terms">Terms of service</Link>
        </div>
        <div className="footer-social">
          <span className="footer-label">FOLLOW THE STORY</span>
          <a href="https://instagram.com" aria-label="Instagram">ig <span>↗</span></a>
          <a href="https://x.com" aria-label="X">x <span>↗</span></a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2024 FYNLOP. ALL RIGHTS RESERVED.</span>
        <span>INDEPENDENT STORIES. INFINITE WORLDS.</span>
      </div>
    </footer>
  );
}
