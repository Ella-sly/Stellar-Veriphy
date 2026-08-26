# StellarVeriphy Integration Guide

This guide shows how to integrate StellarVeriphy verification and provenance
features into external applications.

## 1. Choose an Integration Path

| Path           | Best for                                 | Entry point                            |
| -------------- | ---------------------------------------- | -------------------------------------- |
| HTTP API       | Web apps, backends, partner integrations | `/api/verification` and `/docs`        |
| Widget         | Static sites and CMS embeds              | `frontend/public/widget.js`            |
| Contract calls | Wallets, indexers, on-chain workflows    | Oracle, Provenance, Registry contracts |

Use the HTTP API for normal application integrations. Use direct Soroban calls
when your app already builds and signs Stellar transactions.

## 2. Prepare Content Metadata

Generate a SHA-256 hash for the exact bytes you want to verify. Store large
media in your own storage layer, such as IPFS, S3, or another immutable store,
then include the storage reference in the manifest metadata.

```json
{
  "contentHash": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  "creator": "GBRPYHIL2CI3EXAMPLESTELLARADDRESSVALUE000000000000000",
  "timestamp": "2026-08-26T12:00:00.000Z",
  "metadata": {
    "title": "Example asset",
    "storageRef": "ipfs://bafy..."
  }
}
```

## 3. Authenticate Requests

Browser integrations should connect a Stellar wallet and ask the user to sign
transactions with their own account. Server integrations should use a service
wallet controlled by your application.

Recommended rules:

- Never send a user's secret key to StellarVeriphy.
- Store service signing keys in a managed secret store.
- Require creator authorization for certificate mutations.
- Use separate keys for development, staging, and production.

```ts
import { getAddress, isConnected } from "@stellar/freighter-api";

export async function getWalletAddress() {
  const connected = await isConnected();
  if (!connected.isConnected) {
    throw new Error("Connect Freighter before verifying content.");
  }

  const address = await getAddress();
  return address.address;
}
```

## 4. Submit a Verification Request

TypeScript HTTP example:

```ts
type VerificationResponse = {
  id: string;
  status: "pending" | "verified" | "rejected";
  certificateId?: string;
};

export async function submitVerification(apiBaseUrl: string, token: string, manifest: object) {
  const response = await fetch(`${apiBaseUrl}/api/verification`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ manifest }),
  });

  if (!response.ok) {
    throw await toIntegrationError(response);
  }

  return (await response.json()) as VerificationResponse;
}
```

Python HTTP example:

```python
import requests

def submit_verification(api_base_url, token, manifest):
    response = requests.post(
        f"{api_base_url}/api/verification",
        headers={
            "content-type": "application/json",
            "authorization": f"Bearer {token}",
        },
        json={"manifest": manifest},
        timeout=30,
    )
    if response.status_code >= 400:
        raise RuntimeError(response.json())
    return response.json()
```

Soroban CLI example:

```bash
stellar contract invoke --id $ORACLE_ID --network testnet --source alice -- \
  submit_request --storage-ref ipfs://bafy... \
  --manifest-hash 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08 \
  --requester $ALICE_ADDRESS \
  --priority Normal
```

## 5. Poll Status and Fetch Certificates

Use the request ID from submission to track pending verification. When a
certificate is minted, query the provenance contract by certificate ID, creator,
verification code, or collection.

```ts
export async function waitForVerification(apiBaseUrl: string, id: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(`${apiBaseUrl}/api/verification?id=${encodeURIComponent(id)}`);
    const result = await response.json();

    if (result.status === "verified" || result.status === "rejected") {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error("Verification did not complete before timeout.");
}
```

## 6. Handle Errors

Handle HTTP status codes, validation failures, and typed contract errors.

```ts
type IntegrationError = {
  status: number;
  code: string;
  message: string;
  retryAfter?: number;
};

async function toIntegrationError(response: Response): Promise<IntegrationError> {
  const body = await response.json().catch(() => ({}));

  return {
    status: response.status,
    code: body.error ?? "request_failed",
    message: body.details ?? body.error ?? response.statusText,
    retryAfter: Number(response.headers.get("retry-after") ?? 0) || undefined,
  };
}
```

| Status or error                | Meaning                             | Recommended handling                                           |
| ------------------------------ | ----------------------------------- | -------------------------------------------------------------- |
| `400`                          | Invalid JSON or manifest data       | Show field-level validation messages.                          |
| `401` / `403`                  | Missing or invalid authorization    | Prompt reconnect, refresh token, or use the right service key. |
| `404` / `CertificateNotFound`  | Unknown request or certificate      | Confirm the ID and network.                                    |
| `409` / `DuplicateCertificate` | Manifest already has a certificate  | Fetch the existing certificate instead of resubmitting.        |
| `429`                          | Rate limit exceeded                 | Back off using `Retry-After` when present.                     |
| `TeeNotVerified`               | Provider attestation is not trusted | Retry with another provider or pause automated acceptance.     |

## 7. Respect Rate Limits

The frontend API includes request validation and rate limiting. Treat `429`
responses as temporary. Use exponential backoff, and avoid retrying
non-idempotent submissions until you have checked whether a request or
certificate already exists.

```ts
const delayMs = Math.min(30000, 1000 * 2 ** attempt);
await new Promise((resolve) => setTimeout(resolve, delayMs));
```

## 8. Embed the Widget

For static pages, serve the bundled widget script and point it at your
certificate lookup or verification endpoint.

```html
<div id="stellarveriphy-widget"></div>
<script src="/widget.js"></script>
<script>
  window.StellarVeriphyWidget.mount("#stellarveriphy-widget", {
    apiBaseUrl: "https://your-domain.example",
  });
</script>
```

## 9. Troubleshooting

| Symptom                      | Check                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Wallet prompts do not appear | Confirm Freighter is installed, unlocked, and on the expected network.            |
| Valid hash rejected          | Ensure the hash is SHA-256 hex for the exact uploaded bytes.                      |
| Certificate lookup fails     | Check whether you are querying the same network where the certificate was minted. |
| Verification remains pending | Inspect provider availability, request TTL, and provider suspension state.        |
| RustDoc generation fails     | Fix malformed Rust source before running `pnpm docs:contracts`.                   |

## 10. Production Checklist

- Pin deployed contract IDs per network in configuration.
- Log request IDs and certificate IDs together.
- Surface typed contract errors to users in plain language.
- Store manifests immutably after submission.
- Monitor `429`, provider suspension, and dispute events.
- Publish generated RustDoc from the same commit as deployed contracts.
