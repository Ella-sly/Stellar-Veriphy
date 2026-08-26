"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

const SUPPORTED_ALGORITHMS = [
  { value: "RSA-SHA256", label: "RSA with SHA-256" },
  { value: "ECDSA-SHA256", label: "ECDSA with SHA-256" },
] as const;

type SupportedAlgorithm = (typeof SUPPORTED_ALGORITHMS)[number]["value"];

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/\s+/g, "");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function hexToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/\s+/g, "");
  if (normalized.length % 2 !== 0) {
    throw new Error("Hex signatures must contain an even number of characters.");
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }
  return bytes;
}

function decodeSignatureInput(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.trim().replace(/\s+/g, "");
  if (!normalized) {
    throw new Error("Signature input is required.");
  }

  if (/^[0-9a-fA-F]+$/.test(normalized) && normalized.length % 2 === 0) {
    return hexToBytes(normalized);
  }

  return base64ToBytes(normalized);
}

function parsePublicKeyInput(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("Public key input is required.");
  }

  const pemMatch = normalized.match(/-----BEGIN ([A-Z ]+KEY)-----([\s\S]+?)-----END \1-----/);

  if (pemMatch) {
    return base64ToBytes(pemMatch[2]!.replace(/\s+/g, ""));
  }

  if (/^[0-9a-fA-F]+$/.test(normalized.replace(/\s+/g, ""))) {
    return hexToBytes(normalized.replace(/\s+/g, ""));
  }

  return base64ToBytes(normalized.replace(/\s+/g, ""));
}

function formatHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function SignatureVerifierPage() {
  const [algorithm, setAlgorithm] = useState<SupportedAlgorithm>("RSA-SHA256");
  const [publicKey, setPublicKey] = useState("");
  const [payload, setPayload] = useState("This attestation was produced by StellarVeriphy");
  const [signature, setSignature] = useState("");
  const [result, setResult] = useState<{ verified: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signatureLength, setSignatureLength] = useState<number>(0);

  const signatureHint = useMemo(() => {
    if (!signature.trim()) return "Paste a base64 or hex-encoded signature.";
    return `Signature length: ${signatureLength} bytes`;
  }, [signatureLength, signature]);

  const handleVerify = async () => {
    try {
      const signatureBytes = decodeSignatureInput(signature);
      const publicKeyBytes = parsePublicKeyInput(publicKey);
      const messageBytes = new TextEncoder().encode(payload);
      const digest = await crypto.subtle.digest("SHA-256", messageBytes);

      const keyAlgorithm =
        algorithm === "RSA-SHA256"
          ? { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }
          : { name: "ECDSA", namedCurve: "P-256" };

      const key = await crypto.subtle.importKey("spki", publicKeyBytes, keyAlgorithm, false, [
        "verify",
      ]);

      const verified = await crypto.subtle.verify(
        algorithm === "RSA-SHA256"
          ? { name: "RSASSA-PKCS1-v1_5" }
          : { name: "ECDSA", hash: "SHA-256" },
        key,
        signatureBytes,
        digest
      );

      setResult({
        verified,
        message: verified
          ? "Signature verified successfully against the supplied payload."
          : "Signature could not be verified with the supplied public key and payload.",
      });
      setError(null);
    } catch (caughtError) {
      setResult(null);
      setError(caughtError instanceof Error ? caughtError.message : "Verification failed.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <Header />
      <div className="mx-auto max-w-6xl px-6">
        <Breadcrumbs variant="dark" />
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
        <div className="space-y-3">
          <Link href="/tools" className="text-sm text-blue-400 hover:text-blue-300">
            ← Back to tools
          </Link>
          <h1 className="text-4xl font-semibold">Signature Verification</h1>
          <p className="max-w-3xl text-lg text-slate-300">
            Independently validate signatures for attestations and signed payloads before you trust
            them.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-200">
                Signature algorithm
                <select
                  value={algorithm}
                  onChange={(event) => setAlgorithm(event.target.value as SupportedAlgorithm)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                >
                  {SUPPORTED_ALGORITHMS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-200">
                Public key
                <textarea
                  value={publicKey}
                  onChange={(event) => setPublicKey(event.target.value)}
                  placeholder="Paste a PEM, base64, or hex-encoded public key"
                  className="mt-2 min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100"
                />
                <span className="mt-2 block text-xs text-slate-400">
                  Tooltips: Use a PEM-encoded public key when possible. The verifier accepts DER and
                  hex encodings too.
                </span>
              </label>

              <label className="block text-sm font-medium text-slate-200">
                Message or payload
                <textarea
                  value={payload}
                  onChange={(event) => setPayload(event.target.value)}
                  className="mt-2 min-h-28 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-200">
                Signature
                <textarea
                  value={signature}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setSignature(nextValue);
                    try {
                      const bytes = decodeSignatureInput(nextValue);
                      setSignatureLength(bytes.byteLength);
                    } catch {
                      setSignatureLength(0);
                    }
                  }}
                  placeholder="Paste a base64 or hex signature"
                  className="mt-2 min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100"
                />
                <span className="mt-2 block text-xs text-slate-400">{signatureHint}</span>
              </label>

              <button
                onClick={() => {
                  void handleVerify();
                }}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500"
              >
                Verify signature
              </button>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold text-white">Verification outcome</h2>
              {result ? (
                <div
                  className={`mt-4 rounded-xl border px-4 py-3 ${result.verified ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-amber-500/40 bg-amber-500/10 text-amber-300"}`}
                >
                  <p className="font-semibold">
                    {result.verified ? "Verified" : "Could not verify"}
                  </p>
                  <p className="mt-2 text-sm">{result.message}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">
                  Results appear here after you verify a signature.
                </p>
              )}
              {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-white">How it works</h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
                <li>• The payload is hashed with SHA-256 before verification.</li>
                <li>• The verifier checks the supplied signature against the public key.</li>
                <li>• Unsupported key formats will be flagged so you can re-check the input.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-white">Expected format</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Use a PEM public key for the best experience, then paste a base64 or hex signature.
                The tool records the byte-length for quick sanity checking.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
