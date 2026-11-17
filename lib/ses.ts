import "server-only";

import { SendEmailCommand } from "@aws-sdk/client-ses";
import { requiredEnvironmentVariable, ses } from "./aws-config";

export async function sendOrderConfirmation(
  recipient: string,
  productTitles: string[],
): Promise<void> {
  const items = productTitles.map((title) => `- ${title}`).join("\n");
  await ses.send(
    new SendEmailCommand({
      Source: requiredEnvironmentVariable("AWS_SES_FROM_EMAIL"),
      Destination: { ToAddresses: [recipient] },
      Message: {
        Subject: { Data: "Your FYNLOP purchase is ready", Charset: "UTF-8" },
        Body: {
          Text: {
            Data: `Thank you for your purchase.\n\nYour editions are ready in My Library:\n${items}\n\nFYNLOP`,
            Charset: "UTF-8",
          },
        },
      },
    }),
  );
}

export async function sendCollectionSubscriptionEnded(
  recipient: string,
  collectionTitle: string,
): Promise<void> {
  await ses.send(
    new SendEmailCommand({
      Source: requiredEnvironmentVariable("AWS_SES_FROM_EMAIL"),
      Destination: { ToAddresses: [recipient] },
      Message: {
        Subject: { Data: `Your ${collectionTitle} subscription term has ended`, Charset: "UTF-8" },
        Body: {
          Text: {
            Data: `Your 120-month ${collectionTitle} subscription has reached its end. To continue receiving new releases, please subscribe again and authorize a new recurring payment at https://www.fynlop.com/shop.\n\nFYNLOP`,
            Charset: "UTF-8",
          },
        },
      },
    }),
  );
}
