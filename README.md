# FYNLOP — Stories Beyond Reality

A digital comics and books storefront built with Next.js, TypeScript, AWS, Razorpay, Framer Motion, and Lucide.

## AWS setup

1. Install the project dependencies with `npm install`.
2. Keep the AWS and Razorpay credentials in the ignored `.env.local` file. The app uses `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_COGNITO_USER_POOL_ID`, `AWS_COGNITO_CLIENT_ID`, `AWS_S3_BUCKET`, `AWS_SES_FROM_EMAIL`, `ADMIN_EMAIL`, and the four `DYNAMODB_*_TABLE` values.
3. Run `node scripts/setup-aws.js`. The script loads `.env.local`, creates or reuses the four DynamoDB tables, the S3 bucket, the Cognito pool/client, requests SES sender verification, and prints the AWS values for `.env.local`. It is safe to rerun.
4. Follow the SES verification email before sending store mail.
5. Start the app with `npm run dev`. Register the `ADMIN_EMAIL` address at `/my-library`, verify it using the emailed code, then sign in to `/admin`.

The setup script grants public object reads only for `covers/`, `previews/`, and `logos/`; uploaded PDFs remain private and are served through short-lived signed URLs after purchase verification. Collections and release metadata share the products table. Historical purchases, recurring subscription records, webhook idempotency markers, and billing history share the orders table using separate partition-key prefixes.

## Payments

The store supports both one-time standalone book purchases and independent monthly collection subscriptions. Book checkout creates Razorpay Orders and only grants permanent library access after the server verifies the captured payment. Collection subscriptions use Razorpay Plans and Subscriptions, retaining access until the paid period ends after cancellation. Keep `NEXT_PUBLIC_RAZORPAY_MODE=test` until you are ready for live transactions. Test mode uses `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (or the optional `RAZORPAY_TEST_KEY_ID` / `RAZORPAY_TEST_KEY_SECRET` pair); live mode uses `RAZORPAY_LIVE_KEY_ID` and `RAZORPAY_LIVE_KEY_SECRET`. Secret keys are server-only and are never saved in DynamoDB.

Configure `RAZORPAY_TEST_WEBHOOK_SECRET` and `RAZORPAY_LIVE_WEBHOOK_SECRET` as server environment variables. In the Razorpay Dashboard, register `https://www.fynlop.com/api/webhooks/razorpay` and subscribe to `subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`, `subscription.completed`, and `subscription.expired`. Webhook signatures are verified before any billing or access state is changed.

Razorpay subscriptions are created for 120 monthly cycles (10 years, its documented maximum term). Customers receive a notice at completion and must authorize a new subscription to continue. Collection price changes create a new plan for future subscribers; existing subscriptions retain their already-authorized plan price.

## Included flows

- Browse and search monthly collections and standalone books.
- Create standalone books with one-time prices, cover art, previews, and a private PDF edition from `/admin/products`.
- Buy standalone books once; verified purchases remain in the customer's library permanently.
- Create collections, set monthly prices, and upload or schedule private PDF chapters, episodes, issues, and volumes from `/admin/collections`.
- Subscribe to multiple collections independently, cancel renewals, view billing history, and retain access through the paid period.
- Verify checkout signatures and recurring payment webhooks on the server; issue expiring S3 download links only to subscribers with paid access.
- Preserve access to editions purchased before the collection subscription model.
- Manage collections, subscribers, recurring payment refunds, customers, historical orders, analytics, and store settings from the admin panel.

There are no seeded or sample collections or releases. Add real content through `/admin/collections` before customers can subscribe.

## Checks

```bash
npm run lint
npm run build
```
