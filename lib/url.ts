/**
 * Normalize whatever the customer types into a clean URL we can hand to the
 * scraper. Designed to accept every casual form people actually enter:
 *   - mangocafe.co.za            → https://mangocafe.co.za/
 *   - www.mangocafe.co.za        → https://www.mangocafe.co.za/
 *   - http://mangocafe.co.za     → http://mangocafe.co.za/
 *   - https://mangocafe.co.za    → https://mangocafe.co.za/
 *   - https://mangocafe.co.za/menu → preserves the path
 *   - "  mangocafe.co.za  "      → trims whitespace before normalizing
 *
 * Returns the cleaned URL (always with a scheme), or null if the input is
 * empty / whitespace. Throws a friendly error if the result is still not a
 * valid http(s) URL with a real domain.
 */
export function normalizeWebsiteUrl(
  input: string | null | undefined,
): string | null {
  if (input == null) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  // Add a default scheme if the user didn't type one. Default to https because
  // any small business with a public site should have TLS in 2026; if the
  // owner explicitly typed http://, we preserve it.
  const hasScheme = /^https?:\/\//i.test(trimmed);
  const withScheme = hasScheme
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, "")}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new Error(
      `"${trimmed}" doesn't look like a valid website. Try something like mangocafe.co.za`,
    );
  }

  // Block weird schemes — only real websites.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Website must start with http or https.");
  }

  // Reject bare hostnames with no dot (e.g. "mangocafe") and ipv4 literals
  // typed without a scheme. We want a real public domain.
  if (!parsed.hostname.includes(".")) {
    throw new Error(
      `"${trimmed}" doesn't look like a valid website. Try something like mangocafe.co.za`,
    );
  }

  return parsed.toString();
}
