import nodemailer from "nodemailer";

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null; // not configured — fall back to console logging
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const transporter = createTransporter();

  if (!transporter) {
    // Dev fallback — log to console so the link is visible during local testing
    console.log("\n────── EMAIL (dev fallback) ──────");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${html.replace(/<[^>]*>/g, "")}`);
    console.log("─────────────────────────────────\n");
    return;
  }

  const from = process.env.SMTP_FROM ?? "Divyash Digital <billing@divyashdigital.co.in>";
  await transporter.sendMail({ from, to, subject, html });
}
