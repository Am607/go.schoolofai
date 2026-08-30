import "server-only";

import { serviceFetchJson } from "./service-client";

export async function generateReferralCode(title: string): Promise<string> {
  const { code } = await serviceFetchJson<{ code: string }>(
    "/api/internal/referral-codes/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
      cache: "no-store",
    },
  );

  return code;
}
