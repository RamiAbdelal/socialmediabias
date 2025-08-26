import { NextRequest, NextResponse } from "next/server";

// Helper to fetch Reddit comment body from a permalink
async function fetchRedditCommentBody(permalink: string): Promise<string|null> {
  try {
    const url = `https://www.reddit.com${permalink}.json`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const data = await res.json();
    console.info("Fetched Reddit comments:", data);
    return data;
  } catch {
    console.info("Error fetching Reddit comments");
    return null;
  }
}

export async function GET(req: NextRequest) {
  const permalink = req.nextUrl.searchParams.get("permalink");
  if (!permalink) {
    return NextResponse.json({ error: "Missing permalink parameter" }, { status: 400 });
  }
  const body = await fetchRedditCommentBody(permalink);
  if (body === null) {
    return NextResponse.json({ body: null }, { status: 500 });
  }
  return NextResponse.json({ body }, { status: 200 });
}
