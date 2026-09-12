import "server-only";
import { headers } from "next/headers";

/** Absolute origin of the current request, for links that leave the app
 *  (emails) and therefore can't be relative. */
export async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  return requestHeaders.get("origin") ?? `https://${requestHeaders.get("host")}`;
}
