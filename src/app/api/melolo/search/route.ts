
import { type NextRequest } from "next/server";
import { encryptedResponse, safeJson, upstreamFetch } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");

  if (!query) {
    return encryptedResponse({ error: "Query parameter is required" }, 400);
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api";
    const response = await upstreamFetch(`${baseUrl}/melolo/search?query=${encodeURIComponent(query)}`, { cache: 'no-store' });
    
    if (!response.ok) {
      return encryptedResponse({ error: "Failed to search" }, response.status);
    }

    const data = await safeJson<any>(response);
    return encryptedResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return encryptedResponse({ error: message }, 500);
  }
}
