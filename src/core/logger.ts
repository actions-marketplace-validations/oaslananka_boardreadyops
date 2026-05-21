import pc from "picocolors";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 99,
};

export interface Logger {
  level: LogLevel;
  json: boolean;
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export function createLogger(level: LogLevel, json = false, stream: NodeJS.WritableStream = process.stderr): Logger {
  const log = (entryLevel: Exclude<LogLevel, "silent">, message: string, fields: Record<string, unknown> = {}) => {
    if (levelRank[entryLevel] < levelRank[level]) {
      return;
    }
    if (json) {
      stream.write(`${JSON.stringify({ level: entryLevel, message, ...fields })}\n`);
      return;
    }
    const prefix =
      entryLevel === "error" ? pc.red(entryLevel) : entryLevel === "warn" ? pc.yellow(entryLevel) : entryLevel;
    stream.write(`[${prefix}] ${message}${Object.keys(fields).length ? ` ${JSON.stringify(fields)}` : ""}\n`);
  };
  return {
    level,
    json,
    debug: (message, fields) => log("debug", message, fields),
    info: (message, fields) => log("info", message, fields),
    warn: (message, fields) => log("warn", message, fields),
    error: (message, fields) => log("error", message, fields),
  };
}
