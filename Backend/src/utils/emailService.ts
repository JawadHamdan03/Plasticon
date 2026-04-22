import nodemailer from "nodemailer";

type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || "587");
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = process.env.SMTP_FROM || "no-reply@plasticon.local";

const isPlaceholder = (value?: string) => {
  if (!value) return true;
  const normalized = value.trim().toUpperCase();
  return (
    normalized.length === 0 ||
    normalized.includes("CHANGE_ME") ||
    normalized.includes("YOUR_APP_PASSWORD") ||
    normalized.includes("YOUR_EMAIL")
  );
};

const hasSmtpConfig = Boolean(
  smtpHost &&
  smtpUser &&
  smtpPass &&
  !isPlaceholder(smtpHost) &&
  !isPlaceholder(smtpUser) &&
  !isPlaceholder(smtpPass),
);
export const isSmtpConfigured = hasSmtpConfig;
export const emailDeliveryMode = hasSmtpConfig ? "smtp" : "fallback";

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : null;

export const initializeEmailService = async () => {
  if (!transporter) {
    console.warn(
      "email service: SMTP is not configured (or using placeholder values). Emails will use fallback logging.",
    );
    return;
  }

  try {
    await transporter.verify();
    console.log("email service: SMTP connection verified successfully.");
  } catch (error) {
    console.error(
      "email service: SMTP connection failed. Falling back to log-only mode for development.",
      error,
    );
  }
};

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: SendEmailParams) => {
  if (!transporter) {
    console.log("SMTP not configured. Email fallback log:");
    console.log({ to, subject, text, html });
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text,
      html,
    });

    console.log("email service: sendMail accepted by provider", {
      to,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
  } catch (error) {
    console.error(
      "email service: sendMail failed. Email payload logged instead (fallback mode).",
      error,
    );
    console.log({ to, subject, text, html });
  }
};
