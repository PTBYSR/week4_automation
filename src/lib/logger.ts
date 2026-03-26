/**
 * Utility to send logs to both the browser console AND the terminal (via /api/log)
 */
export const logger = {
  info: (message: string, data?: any) => {
    console.log(message, data || "");
    sendLog("info", message, data);
  },
  warn: (message: string, data?: any) => {
    console.warn(message, data || "");
    sendLog("warn", message, data);
  },
  error: (message: string, data?: any) => {
    console.error(message, data || "");
    sendLog("error", message, data);
  },
};

async function sendLog(level: string, message: string, data?: any) {
  try {
    // Fire and forget to avoid slowing down the UI
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, message, data }),
    }).catch(() => {});
  } catch (e) {
    // Ignore logging errors
  }
}
