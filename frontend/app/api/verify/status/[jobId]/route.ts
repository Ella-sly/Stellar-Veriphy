import { NextRequest, NextResponse } from "next/server";
import { getRequest } from "@/lib/verification-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const record = getRequest(jobId);

  if (!record) {
    return NextResponse.json(
      { error: "not_found", message: `No verification job with id ${jobId}.` },
      { status: 404 }
    );
  }

  return NextResponse.json(record, { status: 200 });
}
