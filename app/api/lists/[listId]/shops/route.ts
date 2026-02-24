import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/api/proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> },
) {
  const { listId } = await params;
  return proxyToBackend(request, `/lists/${listId}/shops`);
}
