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
