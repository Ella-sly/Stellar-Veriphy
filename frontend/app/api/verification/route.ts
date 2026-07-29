import { NextRequest, NextResponse } from "next/server";
import {
  buildRateLimitHeaders,
  evaluateRateLimit,
} from "@/lib/security/rateLimiter";
import { validateVerificationRequest } from "@/lib/security/inputValidation";

function resolveAddressForRateLimit(
  bodyAddress: string | undefined,
  request: NextRequest
): string {
  if (bodyAddress && bodyAddress.trim()) return bodyAddress.trim();

  const headerAddress = request.headers.get("x-wallet-address");
  if (headerAddress && headerAddress.trim()) return headerAddress.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return "anonymous";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    const fallbackIdentity = resolveAddressForRateLimit(undefined, request);
    const fallbackLimit = evaluateRateLimit(fallbackIdentity);
    const fallbackHeaders = buildRateLimitHeaders(fallbackLimit);

    if (!fallbackLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please retry after the backoff period.",
          retryAfterSeconds: fallbackLimit.retryAfterSeconds,
        },
        { status: 429, headers: fallbackHeaders }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Malformed JSON payload.",
      },
      { status: 400, headers: fallbackHeaders }
    );
  }

  const candidateAddress =
    payload && typeof payload === "object" && "address" in payload
      ? String((payload as Record<string, unknown>).address ?? "")
      : undefined;

  const rateLimitKey = resolveAddressForRateLimit(candidateAddress, request);
  const limit = evaluateRateLimit(rateLimitKey);
  const rateLimitHeaders = buildRateLimitHeaders(limit);

  if (!limit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Rate limit exceeded. Please retry after the backoff period.",
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  const validation = validateVerificationRequest(payload);
  if (!validation.valid || !validation.sanitized) {
    return NextResponse.json(
      {
        success: false,
        error: "Request validation failed.",
        details: validation.errors,
      },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        accepted: true,
        message: "Verification request accepted for processing.",
        request: validation.sanitized,
      },
    },
    { status: 202, headers: rateLimitHeaders }
  );
}
