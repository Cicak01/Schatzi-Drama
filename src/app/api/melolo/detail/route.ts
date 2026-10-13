
import { type NextRequest } from "next/server";
import { encryptedResponse, safeJson, upstreamFetch } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const bookId = searchParams.get("bookId") || searchParams.get("book_id");

  if (!bookId) {
    return encryptedResponse({ error: "Missing bookId" }, 400);
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api";
    const response = await upstreamFetch(`${baseUrl}/melolo/detail?book_id=${encodeURIComponent(bookId)}`, { cache: 'no-store' });
    
    if (!response.ok) {
      return encryptedResponse({ error: "Failed to fetch detail data" }, response.status);
    }

    const data = await safeJson<any>(response);
    return encryptedResponse(data);
  } catch (error) {
    console.error("Error fetching Melolo detail:", error);
    return encryptedResponse({ error: "Failed to fetch data" }, 500);
  }
}
