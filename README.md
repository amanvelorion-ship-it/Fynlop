# FYNLOP — Stories Beyond Reality

A digital comics and books storefront built with Next.js, TypeScript, AWS, Razorpay, Framer Motion, and Lucide.

## AWS setup

1. Install the project dependencies with `npm install`.
2. Keep the AWS and Razorpay credentials in the ignored `.env.local` file. The app uses `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_COGNITO_USER_POOL_ID`, `AWS_COGNITO_CLIENT_ID`, `AWS_S3_BUCKET`, `AWS_SES_FROM_EMAIL`, `ADMIN_EMAIL`, and the four `DYNAMODB_*_TABLE` values.
3. Run `node scripts/setup-aws.js`. The script loads `.env.local`, creates or reuses the four DynamoDB tables, the S3 bucket, the Cognito pool/client, configures S3 CORS for signed product uploads, requests SES sender verification, and prints the AWS values for `.env.local`. It is safe to rerun; rerun it to apply the CORS change to an existing bucket.
4. Follow the SES verification email before sending store mail.
5. Start the app with `npm run dev`. Register the `ADMIN_EMAIL` address at `/my-library`, verify it using the emailed code, then sign in to `/admin`.

The setup script grants public object reads only for `covers/`, `previews/`, and `logos/`; uploaded PDFs remain private and are served through short-lived signed URLs after purchase verification. Admin product files upload directly from the browser to S3 using short-lived, authenticated presigned URLs, so large PDFs do not pass through the app server. Products are stored in the products table, and purchase records are stored in the orders table.

## Payments

The store supports one-time standalone book purchases. Checkout creates Razorpay Orders and only grants permanent library access after the server verifies the captured payment. Keep `NEXT_PUBLIC_RAZORPAY_MODE=test` until you are ready for live transactions. Test mode uses `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (or the optional `RAZORPAY_TEST_KEY_ID` / `RAZORPAY_TEST_KEY_SECRET` pair); live mode uses `RAZORPAY_LIVE_KEY_ID` and `RAZORPAY_LIVE_KEY_SECRET`. Secret keys are server-only and are never saved in DynamoDB.

## Included flows

- Browse and search standalone books.
- Create standalone books with one-time prices, cover art, previews, and a private PDF edition from `/admin/products`.
- Buy standalone books once; verified purchases remain in the customer's library permanently.
- Verify checkout signatures on the server and issue expiring S3 download links only to customers who own the book.
- Manage customers, historical orders, analytics, and store settings from the admin panel.

## Checks

```bash
npm run lint
npm run build
```
