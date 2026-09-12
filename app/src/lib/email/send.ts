import "server-only";

// Transactional email through Resend's REST API. One endpoint is all this app
// needs, so there's no SDK dependency to keep in step with Next.
const RESEND_ENDPOINT = "https://api.resend.com/emails";

const DEFAULT_FROM = "SABER College <enrollments@sabercollege.edu>";

export type EmailAttachment = {
  filename: string;
  /** base64-encoded file contents */
  content: string;
};

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

/** False when RESEND_API_KEY is unset, which is the normal state locally. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/**
 * Sends one email. Never throws: a contract that was signed should not be
 * rolled back because the notification bounced, so callers get an error string
 * to surface and decide about instead of an exception.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn(`Email not sent (RESEND_API_KEY unset): "${input.subject}"`);
    return { error: "Email is not configured" };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM?.trim() || DEFAULT_FROM,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(input.attachments?.length ? { attachments: input.attachments } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(`Resend rejected "${input.subject}": ${response.status} ${detail}`);
      return { error: `Email provider returned ${response.status}` };
    }

    return {};
  } catch (err) {
    console.error(`Could not reach Resend for "${input.subject}"`, err);
    return { error: (err as Error).message };
  }
}
