export default function TermsPage() {
  const supportEmail = process.env.AWS_SES_FROM_EMAIL;
  return (
    <main className="page-shell page-width">
      <header className="page-heading">
        <p className="eyebrow"><span className="eyebrow-mark" /> THE FINE PRINT</p>
        <h1>Terms of <em>service.</em></h1>
      </header>
      <article className="legal-copy">
        <p>By using FYNLOP, you agree to use this store and its digital editions lawfully. Product descriptions, prices, and availability are shown before checkout and may change for future orders.</p>
        <h2>Digital purchases</h2>
        <p>A completed purchase gives the account used at checkout access to the purchased digital edition for personal use. Do not redistribute, resell, or publicly share files unless the rights holder has expressly allowed it.</p>
        <h2>Accounts and payments</h2>
        <p>Keep your account credentials private. Payments are processed by Razorpay, while accounts and purchase records are managed using AWS services. Their respective terms and privacy policies apply.</p>
        <h2>Support</h2>
        <p>For account or order assistance, contact {supportEmail ? <a href={`mailto:${supportEmail}`}>{supportEmail}</a> : "FYNLOP support"}. These terms do not override consumer protections that apply under local law.</p>
      </article>
    </main>
  );
}
