import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  const supportEmail = process.env.AWS_SES_FROM_EMAIL;
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div>
          <Link className="brand footer-brand" href="/">
            <Image src="/FYNLOP_ LOGO.png" alt="FYNLOP" width={180} height={72} />
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
          {supportEmail && <a href={`mailto:${supportEmail}`}>Contact support</a>}
          <Link href="/refund-policy">Refund policy</Link>
          <Link href="/terms">Terms of service</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© FYNLOP. ALL RIGHTS RESERVED.</span>
        <span>INDEPENDENT STORIES. INFINITE WORLDS.</span>
      </div>
    </footer>
  );
}
