import Link from "next/link";

export default function RefundPolicyPage() {
  const supportEmail = process.env.AWS_SES_FROM_EMAIL;
  return (
    <main className="page-shell page-width">
      <header className="page-heading">
        <p className="eyebrow"><span className="eyebrow-mark" /> CUSTOMER CARE</p>
        <h1>Refund <em>policy.</em></h1>
      </header>
      <article className="legal-copy">
        <p>FYNLOP sells digital editions delivered electronically. Because a digital file can be accessed immediately after purchase, completed purchases are generally non-refundable.</p>
        <h2>When to contact us</h2>
        <p>If you were charged more than once, cannot access a verified purchase, or received a file that is damaged or materially different from its description, contact {supportEmail ? <a href={`mailto:${supportEmail}`}>{supportEmail}</a> : "FYNLOP support"} with your order details. We will investigate and, where appropriate, arrange a replacement or refund.</p>
        <h2>Payment disputes</h2>
        <p>Please contact us before opening a payment dispute so we can try to resolve the issue promptly. This policy does not limit any consumer rights that apply under local law.</p>
        <p>For more help, <Link href="/my-library">visit your library</Link> or email our support team.</p>
      </article>
    </main>
  );
}
