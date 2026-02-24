import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/api/proxy";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string; shopId: string }> },
) {
  const { listId, shopId } = await params;
  return proxyToBackend(request, `/lists/${listId}/shops/${shopId}`);
}
