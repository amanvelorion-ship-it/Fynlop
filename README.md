# FYNLOP — Stories Beyond Reality

A dark, cinematic storefront for digital comics and books, built with the Next.js App Router, TypeScript, Tailwind CSS, Supabase, Framer Motion, and Razorpay.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase and Razorpay credentials. Keep `.env.local` private.
3. Run `supabase/schema.sql` in the SQL editor for your Supabase project.
4. Create the `aman.velorion@gmail.com` administrator account in Supabase Auth with email/password sign-in enabled. Only that email can access `/admin`; do not enable public admin sign-up.
5. Start the app with `npm run dev`, then sign in to `/admin` and use **Products → Add product** to upload covers, up to three preview images, and the private PDF edition. The admin panel stores covers/previews in the public `product-covers` bucket and PDFs in the private `digital-editions` bucket.

The app uses Next.js 16's `proxy.ts` convention for early redirects and verifies the user again on every admin page and mutation.

The Supabase service-role key and Razorpay secrets are server-only. Never prefix them with `NEXT_PUBLIC_` or expose them to the browser. The Razorpay key ID is public by design. Test mode accepts the legacy `NEXT_PUBLIC_RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` pair, or the `RAZORPAY_TEST_KEY_ID` / `RAZORPAY_TEST_KEY_SECRET` pair. Live mode requires `RAZORPAY_LIVE_KEY_ID` and `RAZORPAY_LIVE_KEY_SECRET`; the mode selector never stores secrets in the database. Keep test credentials selected until your payment account is ready for live transactions.

The six catalog entries are sample product records with Picsum cover art and no edition PDFs. Checkout intentionally refuses to charge unless each selected edition has an uploaded file in the private Supabase bucket and a matching `products.file_url`. Replace sample content or publish finished editions before launch.

## Included flows

- Browse, search, filter, sort, and view the catalog; admin-created products are loaded from Supabase.
- Add products to a local cart and proceed through Razorpay Checkout.
- Create or sign in to a Supabase account and view verified purchases.
- Verify Razorpay signatures on the server, store purchases with the service-role key, and issue short-lived signed links for private files.
- Manage products, customers, orders/refunds, analytics, and store configuration from the administrator panel.

## Checks

```bash
npm run lint
npm run build
```
