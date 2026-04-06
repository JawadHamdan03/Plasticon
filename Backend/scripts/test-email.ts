import "dotenv/config";
import { sendEmail } from "../src/utils/emailService";

const recipient = process.env.TEST_EMAIL_TO;

async function run() {
  if (!recipient) {
    console.error("Missing TEST_EMAIL_TO in environment.");
    process.exit(1);
  }

  await sendEmail({
    to: recipient,
    subject: "Plasticon SMTP test",
    text: "This is a test email from Plasticon backend.",
    html: "<p>This is a test email from <strong>Plasticon</strong> backend.</p>",
  });

  console.log("Email send request completed.");
}

run().catch((error) => {
  console.error("Failed to send test email:", error);
  process.exit(1);
});
