import { NextRequest, NextResponse } from "next/server";

// ----- Config (edit here) -----
const DEFAULT_UA = process.env.REDDIT_USER_AGENT || "Mozilla/5.0";
// --------------------------------

// Helper to extract OG:image from HTML string
function extractOgImage(html: string): string | null {
  const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i);
  return match ? match[1] : null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
  const response = await fetch(url, { headers: { "User-Agent": DEFAULT_UA } });
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch target URL" }, { status: 500 });
    }
    const html = await response.text();
    const ogImage = extractOgImage(html);
    if (!ogImage) {
      return NextResponse.json({ ogImage: null }, { status: 200 });
    }
    return NextResponse.json({ ogImage }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: "Fetch error" }, { status: 500 });
  }
}
