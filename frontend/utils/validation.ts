// ---------------------------------------------------------------------------
// SHA-256
// ---------------------------------------------------------------------------

/** Returns true if `hash` is a valid 64-character lowercase/uppercase hex string. */
export function isValidSHA256(hash: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Returns a descriptive error message when `hash` is not a valid SHA-256 hex
 * string, or `null` when it is valid.
 */
export function validateSHA256(hash: string): string | null {
  if (!hash || hash.trim() === "") {
    return "Hash is required.";
  }
  if (hash.length !== 64) {
    return `SHA-256 hash must be exactly 64 hex characters (got ${hash.length}).`;
  }
  if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
    return "SHA-256 hash must contain only hexadecimal characters (0-9, a-f, A-F).";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Stellar
// ---------------------------------------------------------------------------

/** Returns true if `address` is a valid Stellar public key (G…, 56 chars, base32). */
export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address);
}

// ---------------------------------------------------------------------------
// Ethereum
// ---------------------------------------------------------------------------

/**
 * Returns true if `address` is a valid Ethereum address:
 * "0x" followed by exactly 40 hex characters.
 * Accepts both checksummed (EIP-55) and all-lowercase/uppercase forms.
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// ---------------------------------------------------------------------------
// Asset code
// ---------------------------------------------------------------------------

/**
 * Returns true if `code` is a valid Stellar asset code:
 * 1–12 alphanumeric characters.
 */
export function isValidAssetCode(code: string): boolean {
  return /^[a-zA-Z0-9]{1,12}$/.test(code);
}

// ---------------------------------------------------------------------------
// Amount
// ---------------------------------------------------------------------------

/**
 * Returns true if `amount` represents a valid positive decimal number.
 * Accepts integers and decimals (e.g. "100", "3.14").
 * Rejects negative values, zero, and non-numeric strings.
 */
export function isValidAmount(amount: string | number): boolean {
  const value = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(value) || !isFinite(value)) return false;
  if (value <= 0) return false;
  // Ensure the string form only contains digits and an optional single dot
  const str = String(amount).trim();
  return /^\d+(\.\d+)?$/.test(str);
}

export function downloadJSON(data: object, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadXML(data: object, filename: string) {
  const xml = objectToXml(data);
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function objectToXml(obj: any, rootName = "root"): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<${rootName}>\n`;
  xml += objectToXmlContent(obj, 1);
  xml += `</${rootName}>`;
  return xml;
}

function objectToXmlContent(obj: any, indent: number): string {
  const spaces = "  ".repeat(indent);
  let xml = "";

  for (const [key, value] of Object.entries(obj)) {
    const tagName = key.replace(/[^a-zA-Z0-9_]/g, "_");
    if (value === null || value === undefined) {
      xml += `${spaces}<${tagName} />\n`;
    } else if (typeof value === "object" && !Array.isArray(value)) {
      xml += `${spaces}<${tagName}>\n`;
      xml += objectToXmlContent(value, indent + 1);
      xml += `${spaces}</${tagName}>\n`;
    } else if (Array.isArray(value)) {
      value.forEach((item) => {
        xml += `${spaces}<item>\n`;
        if (typeof item === "object") {
          xml += objectToXmlContent(item, indent + 1);
        } else {
          xml += `${"  ".repeat(indent + 1)}${item}\n`;
        }
        xml += `${spaces}</item>\n`;
      });
    } else {
      xml += `${spaces}<${tagName}>${String(value)}</${tagName}>\n`;
    }
  }

  return xml;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
