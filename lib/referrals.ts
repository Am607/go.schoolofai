import "server-only";

import { serviceFetchJson } from "./service-client";

export async function generateReferralCode(): Promise<string> {
  const { code } = await serviceFetchJson<{ code: string }>(
    "/api/internal/referral-codes/",
    {
      method: "POST",
      cache: "no-store",
    },
  );

  return code;
}
