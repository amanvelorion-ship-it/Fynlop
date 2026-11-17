export default function TermsPage() {
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
        <p>Keep your account credentials private. Payments are processed by Razorpay, and authentication and purchase records are managed through Supabase. Their respective terms and privacy policies apply to those services.</p>
        <h2>Support</h2>
        <p>For account or order assistance, contact <a href="mailto:hello@fynlop.com">hello@fynlop.com</a>. These terms do not override consumer protections that apply under local law.</p>
      </article>
    </main>
  );
}
