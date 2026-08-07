import type { Browser } from "playwright-core";

/**
 * Renders HTML to a PDF buffer. Uses the full local Chromium (from the
 * `playwright` dev dependency) when running locally, and the serverless
 * `@sparticuz/chromium` binary when deployed to Vercel — the standard split
 * because a full Chromium install is too large for a serverless function
 * bundle.
 */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  const { chromium } = await import("playwright-core");
  let browser: Browser;

  if (isServerless) {
    const chromiumBinary = (await import("@sparticuz/chromium")).default;
    browser = await chromium.launch({
      args: chromiumBinary.args,
      executablePath: await chromiumBinary.executablePath(),
      headless: true,
    });
  } else {
    // Locally, playwright-core can drive the Chromium installed by the
    // `playwright` package's `npx playwright install` step.
    browser = await chromium.launch({ headless: true });
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0.4in", bottom: "0.4in", left: "0.4in", right: "0.4in" },
    });
    return pdf;
  } finally {
    await browser.close();
  }
}
