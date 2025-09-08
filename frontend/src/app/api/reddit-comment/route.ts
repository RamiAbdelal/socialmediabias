import { NextRequest, NextResponse } from "next/server";
import { getRedditAccessToken, fetchCommentsWithBackoff } from "@/server/reddit";

// ----- Config (edit here) -----
const COMMENT_TIMEOUT_MS = 10_000;
// --------------------------------

export async function GET(req: NextRequest) {
  const permalink = req.nextUrl.searchParams.get('permalink');
  if (!permalink) {
    return NextResponse.json({ error: 'Missing permalink parameter' }, { status: 400 });
  }
  try {
  const token = await getRedditAccessToken();
  const normalized = permalink.startsWith('/r/') ? permalink : permalink.replace(/^https?:\/\/www\.reddit\.com/, '');
  const thread = await fetchCommentsWithBackoff(normalized, token, COMMENT_TIMEOUT_MS);
  if (!thread) return NextResponse.json({ body: null, error: 'Failed to fetch comments' }, { status: 502 });
  return NextResponse.json({ body: thread }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ body: null, error: message }, { status: 500 });
  }
}
