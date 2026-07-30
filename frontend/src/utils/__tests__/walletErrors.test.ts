import { parseWalletError } from "../walletErrors";

describe("parseWalletError", () => {
  // --- null / undefined ---
  it("returns a fallback message for null", () => {
    const result = parseWalletError(null);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a fallback message for undefined", () => {
    const result = parseWalletError(undefined);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  // --- plain string ---
  it("returns the string itself when given a plain string error", () => {
    const result = parseWalletError("Something went wrong");
    expect(result).toBe("Something went wrong");
  });

  it("returns a fallback message for an empty string", () => {
    const result = parseWalletError("   ");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  // --- Error object ---
  it("returns the Error message for a standard Error object", () => {
    const result = parseWalletError(new Error("Connection refused"));
    expect(result).toBe("Connection refused");
  });

  it("returns a fallback message for an Error with an empty message", () => {
    const result = parseWalletError(new Error(""));
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  // --- Freighter error object with known code ---
  it("maps user-rejection code to a human-readable message", () => {
    const result = parseWalletError({ code: "USER_DECLINED", message: "User declined" });
    expect(result).toBe("You rejected the request in Freighter.");
  });

  it("maps numeric user-rejection code (-4) to a human-readable message", () => {
    const result = parseWalletError({ code: -4 });
    expect(result).toBe("You rejected the request in Freighter.");
  });

  it("maps network mismatch code to a human-readable message", () => {
    const result = parseWalletError({ code: "NETWORK_MISMATCH" });
    expect(result).toMatch(/network mismatch/i);
  });

  it("maps not-installed code to a human-readable message", () => {
    const result = parseWalletError({ code: "NOT_INSTALLED" });
    expect(result).toMatch(/not installed/i);
  });

  it("falls back to the message field for an unknown Freighter code", () => {
    const result = parseWalletError({ code: "UNKNOWN_CODE_999", message: "Some Freighter detail" });
    expect(result).toBe("Some Freighter detail");
  });

  it("returns a fallback for a Freighter object with unknown code and no message", () => {
    const result = parseWalletError({ code: "UNKNOWN_CODE_999" });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  // --- unknown / arbitrary object ---
  it("returns a fallback message for an arbitrary object", () => {
    const result = parseWalletError({ foo: "bar", baz: 42 });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a fallback message for a number", () => {
    const result = parseWalletError(404);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
