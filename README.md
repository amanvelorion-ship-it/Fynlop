# FYNLOP — Stories Beyond Reality

A digital comics and books storefront built with Next.js, TypeScript, AWS, Razorpay, Framer Motion, and Lucide.

## AWS setup

1. Install the project dependencies with `npm install`.
2. Keep the AWS and Razorpay credentials in the ignored `.env.local` file. The app uses `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_COGNITO_USER_POOL_ID`, `AWS_COGNITO_CLIENT_ID`, `AWS_S3_BUCKET`, `AWS_SES_FROM_EMAIL`, `ADMIN_EMAIL`, and the four `DYNAMODB_*_TABLE` values.
3. Run `node scripts/setup-aws.js`. The script loads `.env.local`, creates or reuses the four DynamoDB tables, the S3 bucket, the Cognito pool/client, requests SES sender verification, and prints the AWS values for `.env.local`. It is safe to rerun.
4. Follow the SES verification email before sending store mail.
5. Start the app with `npm run dev`. Register the `ADMIN_EMAIL` address at `/my-library`, verify it using the emailed code, then sign in to `/admin`.

The setup script grants public object reads only for `covers/`, `previews/`, and `logos/`; uploaded PDFs remain private and are served through short-lived signed URLs after purchase verification. Product data, users, orders, and store settings are stored in DynamoDB.

## Payments

Checkout uses Razorpay. Keep `NEXT_PUBLIC_RAZORPAY_MODE=test` until you are ready for live transactions. Test mode uses `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (or the optional `RAZORPAY_TEST_KEY_ID` / `RAZORPAY_TEST_KEY_SECRET` pair); live mode uses `RAZORPAY_LIVE_KEY_ID` and `RAZORPAY_LIVE_KEY_SECRET`. Secret keys are server-only and are never saved in DynamoDB.

## Included flows

- Browse, search, filter, sort, and view products stored in DynamoDB.
- Create products in the admin panel and upload cover art, previews, and private PDF editions to S3.
- Register and sign in with Amazon Cognito, then view paid purchases in My Library.
- Verify Razorpay payments on the server and issue expiring S3 download links to verified purchasers.
- Manage products, customers, orders/refunds, analytics, and store settings from the admin panel.

There are no seeded or sample products. Add real product records and files through `/admin/products` before customers can shop.

## Checks

```bash
npm run lint
npm run build
```
