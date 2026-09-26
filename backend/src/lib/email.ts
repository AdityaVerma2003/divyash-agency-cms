import { Resend } from "resend";

// Sending domain (divyashdigital.co.in) is verified in Resend.
const FROM = process.env.RESEND_FROM ?? "Divyash Digital <info@divyashdigital.co.in>";
const REPLY_TO = process.env.RESEND_REPLY_TO ?? "info@divyashdigital.co.in";

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const client = getClient();

  if (!client) {
    console.log("\n────── EMAIL (dev fallback — RESEND_API_KEY not configured) ──────");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${html.replace(/<[^>]*>/g, "")}`);
    console.log("──────────────────────────────────────────────────────────────────\n");
    return;
  }

  const { error } = await client.emails.send({
    from: FROM,
    to,
    subject,
    html,
    replyTo: REPLY_TO,
  });

  if (error) {
    // Surface the two failures that actually happen in practice, since Resend's
    // message alone ("Invalid `from` field") doesn't say which domain is wrong.
    console.error(`[email] failed to send to ${to}: ${error.message}`);
    console.error(`[email] from=${FROM} — check this domain is verified at https://resend.com/domains`);
    throw new Error(error.message);
  }

  console.log(`[email] sent to ${to} — "${subject}"`);
}
