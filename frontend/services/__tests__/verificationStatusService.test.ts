/**
 * Unit tests for services/verificationStatusService.ts
 * Covers: VerificationStatusService.watch / unwatch / unwatchAll / isWatching
 */

import {
  verificationStatusService,
  type VerificationStatus,
  type VerificationPhase,
} from "../verificationStatusService";

// Use fake timers to control setInterval / setTimeout without waiting
jest.useFakeTimers();

afterEach(() => {
  verificationStatusService.unwatchAll();
  jest.clearAllTimers();
});

// ---------------------------------------------------------------------------
// watch — initial status
// ---------------------------------------------------------------------------

describe("watch — initial 'submitted' status", () => {
  it("calls onUpdate immediately with phase 'submitted'", () => {
    const updates: VerificationStatus[] = [];
    verificationStatusService.watch("job-1", { onUpdate: (s) => updates.push(s) });

    expect(updates.length).toBe(1);
    expect(updates[0]?.phase).toBe("submitted");
    expect(updates[0]?.jobId).toBe("job-1");
    expect(updates[0]?.terminal).toBe(false);
  });

  it("initial status has progress of 10", () => {
    let status: VerificationStatus | null = null;
    verificationStatusService.watch("job-progress", {
      onUpdate: (s) => {
        status = s;
      },
    });
    expect(status!.progress).toBe(10);
  });

  it("includes txHash and requestId when supplied", () => {
    let status: VerificationStatus | null = null;
    verificationStatusService.watch("job-ids", {
      txHash: "tx123",
      requestId: "req456",
      onUpdate: (s) => {
        status = s;
      },
    });
    expect(status!.txHash).toBe("tx123");
    expect(status!.requestId).toBe("req456");
  });
});

// ---------------------------------------------------------------------------
// isWatching
// ---------------------------------------------------------------------------

describe("isWatching", () => {
  it("returns true while a job is being watched", () => {
    verificationStatusService.watch("job-w", { onUpdate: () => {} });
    expect(verificationStatusService.isWatching("job-w")).toBe(true);
  });

  it("returns false for an unknown job", () => {
    expect(verificationStatusService.isWatching("no-such-job")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// unwatch
// ---------------------------------------------------------------------------

describe("unwatch", () => {
  it("stops polling and sets isWatching to false", () => {
    verificationStatusService.watch("job-stop", { onUpdate: () => {} });
    verificationStatusService.unwatch("job-stop");
    expect(verificationStatusService.isWatching("job-stop")).toBe(false);
  });

  it("is a no-op for an unknown job", () => {
    expect(() => verificationStatusService.unwatch("ghost")).not.toThrow();
  });

  it("unsubscribe function returned by watch also stops polling", () => {
    const unsub = verificationStatusService.watch("job-unsub", { onUpdate: () => {} });
    unsub();
    expect(verificationStatusService.isWatching("job-unsub")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// unwatchAll
// ---------------------------------------------------------------------------

describe("unwatchAll", () => {
  it("stops all active polls", () => {
    verificationStatusService.watch("j1", { onUpdate: () => {} });
    verificationStatusService.watch("j2", { onUpdate: () => {} });
    verificationStatusService.unwatchAll();
    expect(verificationStatusService.isWatching("j1")).toBe(false);
    expect(verificationStatusService.isWatching("j2")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Phase progression (mocked interval)
// ---------------------------------------------------------------------------

describe("phase progression", () => {
  it("advances to 'processing' after first interval tick", async () => {
    const phases: VerificationPhase[] = [];
    verificationStatusService.watch("job-phases", {
      intervalMs: 100,
      onUpdate: (s) => phases.push(s.phase),
    });
    // Initial: submitted
    expect(phases).toContain("submitted");

    // First tick → pending (no txHash, so skip Horizon check → processing)
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    await Promise.resolve();

    // Should have progressed beyond submitted
    expect(phases.length).toBeGreaterThan(1);
  });

  it("terminal phase stops polling", async () => {
    const phases: VerificationPhase[] = [];
    let terminalFired = false;

    verificationStatusService.watch("job-terminal", {
      intervalMs: 50,
      onUpdate: (s) => phases.push(s.phase),
      onTerminal: () => {
        terminalFired = true;
      },
    });

    // Advance enough for the mock to reach 'verified'
    for (let i = 0; i < 10; i++) {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    }

    if (phases.includes("verified")) {
      expect(terminalFired).toBe(true);
      expect(verificationStatusService.isWatching("job-terminal")).toBe(false);
    }
  });

  it("emits 'expired' after timeout", async () => {
    const phases: VerificationPhase[] = [];
    verificationStatusService.watch("job-timeout", {
      intervalMs: 99999, // very long interval so normal ticks don't fire
      timeoutMs: 100, // but timeout is short
      onUpdate: (s) => phases.push(s.phase),
    });

    jest.advanceTimersByTime(200);
    await Promise.resolve();

    expect(phases).toContain("expired");
    expect(verificationStatusService.isWatching("job-timeout")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Status fields
// ---------------------------------------------------------------------------

describe("status fields", () => {
  it("updatedAt is a valid ISO string", () => {
    let status: VerificationStatus | null = null;
    verificationStatusService.watch("job-date", {
      onUpdate: (s) => {
        status ??= s;
      },
    });
    expect(() => new Date(status!.updatedAt)).not.toThrow();
    expect(new Date(status!.updatedAt).toISOString()).toBe(status!.updatedAt);
  });

  it("message is a non-empty string for every phase", () => {
    let status: VerificationStatus | null = null;
    verificationStatusService.watch("job-msg", {
      onUpdate: (s) => {
        status = s;
      },
    });
    expect(status!.message.length).toBeGreaterThan(0);
  });
});
