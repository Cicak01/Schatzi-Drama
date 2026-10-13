import { safeJson, encryptedResponse, upstreamFetch } from "@/lib/api-utils";
import { NextRequest } from "next/server";
import { extractMeloloBooks } from "../utils";

export const dynamic = 'force-dynamic';

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api") + "/melolo";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const offsetStr = searchParams.get("offset") || "0";
    const currentOffset = parseInt(offsetStr, 10) || 0;
    
    // Melolo uses offset-based pagination
    const response = await upstreamFetch(`${UPSTREAM_API}/foryou?offset=${currentOffset}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return encryptedResponse({ 
        books: [], 
        has_more: false, 
        next_offset: undefined 
      });
    }

    const json = await safeJson<any>(response);
    const data = json?.data;
    const books = extractMeloloBooks(data);
    
    // Extract pagination info
    const rawHasMore = data?.has_more ?? data?.cell?.has_more ?? false;
    const rawNextOffset = data?.next_offset ?? data?.cell?.next_offset ?? (currentOffset + books.length);

    // Enforce infinite scroll limit up to offset 100
    const nextOffset = (rawNextOffset > 100 || currentOffset >= 100) ? undefined : rawNextOffset;
    const hasMore = Boolean(rawHasMore && nextOffset !== undefined && currentOffset < 100);

    return encryptedResponse({
      books: books,
      has_more: hasMore,
      next_offset: nextOffset,
      code: json?.code ?? 0
    });
  } catch (error) {
    console.error("Melolo ForYou Error:", error);
    return encryptedResponse({ 
      books: [], 
      has_more: false, 
      next_offset: undefined 
    });
  }
}
