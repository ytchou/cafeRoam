import { NextResponse } from "next/server";

// TODO: implement auth route — backend/api/auth.py needs to be created first
// See Code Review Fixes plan Chunk 4

export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
