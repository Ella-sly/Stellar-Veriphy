/**
 * logger.ts
 *
 * Lightweight logging utility with level-based filtering. Debug and info
 * logs are suppressed in production; warnings and errors are always logged.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const isProduction = process.env.NODE_ENV === "production";
const activeLevel: LogLevel = isProduction ? "warn" : "debug";

function isEnabled(level: LogLevel): boolean {
    return LOG_LEVEL_WEIGHT[level] >= LOG_LEVEL_WEIGHT[activeLevel];
}

function log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!isEnabled(level)) return;

    const prefix = `[${level.toUpperCase()}]`;
     
    console[level](prefix, message, ...args);
}

export const logger = {
    debug: (message: string, ...args: unknown[]) => log("debug", message, ...args),
    info: (message: string, ...args: unknown[]) => log("info", message, ...args),
    warn: (message: string, ...args: unknown[]) => log("warn", message, ...args),
    // Errors are always logged, regardless of environment.
    error: (message: string, ...args: unknown[]) => {
         
        console.error("[ERROR]", message, ...args);
    },
};
