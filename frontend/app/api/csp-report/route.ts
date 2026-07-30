import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = await request.json().catch(() => null);
    console.warn("[csp-report]", JSON.stringify(payload));
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[csp-report] failed", error);
    return NextResponse.json({ received: false }, { status: 400 });
  }
}
