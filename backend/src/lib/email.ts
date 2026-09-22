import nodemailer from "nodemailer";

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  const port = Number(SMTP_PORT ?? 587);
  const secure = port === 465;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    // requireTLS forces STARTTLS upgrade on port 587 — needed on cloud hosts like Render
    requireTLS: !secure,
    auth: {
      user: SMTP_USER,
      // Gmail App Passwords work with or without spaces — strip them to be safe
      pass: SMTP_PASS.replace(/\s/g, ""),
    },
    tls: {
      // Allow self-signed certs on the SMTP relay (common on some hosts)
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },
  });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const transporter = createTransporter();

  if (!transporter) {
    console.log("\n────── EMAIL (dev fallback — SMTP not configured) ──────");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${html.replace(/<[^>]*>/g, "")}`);
    console.log("────────────────────────────────────────────────────────\n");
    return;
  }

  const from = process.env.SMTP_FROM ?? "Divyash Digital <billing@divyashdigital.co.in>";

  try {
    await transporter.sendMail({ from, to, subject, html });
    console.log(`[email] sent to ${to} — "${subject}"`);
  } catch (err) {
    console.error(`[email] failed to send to ${to}:`, err instanceof Error ? err.message : err);
    throw err;
  }
}
