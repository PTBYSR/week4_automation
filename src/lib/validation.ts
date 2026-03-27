/**
 * Simple URL validator that checks for protocol and structure.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Checks if the input text is likely gibberish or too low-quality to process.
 */
export function isNonsense(text: string): { valid: boolean; reason?: string } {
  const trimmed = text.trim();

  // 1. Length check
  if (trimmed.length < 15) {
    return { valid: false, reason: "Please provide a more detailed idea (at least 15 characters)." };
  }

  // 2. Word count check
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 3) {
    return { valid: false, reason: "Please use at least 3 words to describe your idea." };
  }

  // 3. Gibberish patterns (Key smashes)
  // - Unusual consonant clusters (e.g. "asdfgh")
  const consonantCluster = /[bcdfghjklmnpqrstvwxyz]{6,}/i;
  if (consonantCluster.test(trimmed)) {
    return { valid: false, reason: "The input looks like random characters. Please provide a real idea." };
  }

  // - Repetitive characters (e.g. "aaaaa")
  const repetitive = /(.)\1{5,}/;
  if (repetitive.test(trimmed)) {
    return { valid: false, reason: "The input contains too many repetitive characters." };
  }

  // 4. Character diversity (basic entropy)
  const uniqueChars = new Set(trimmed.toLowerCase().replace(/\s/g, "")).size;
  if (uniqueChars < 4 && trimmed.length > 20) {
    return { valid: false, reason: "The input lacks character diversity. Please provide a clear idea." };
  }

  return { valid: true };
}

/**
 * Transforms a Google Drive link into a direct rendering thumbnail URL.
 * Bypasses ORB/CORS issues by using the specialized image endpoint.
 * Handles both formats:
 *   - Share link:  https://drive.google.com/file/d/FILE_ID/view
 *   - Direct link: https://drive.google.com/uc?export=view&id=FILE_ID
 */
export function formatGoogleDriveUrl(url: string | undefined): string {
  if (!url) return "";

  // Match /d/FILE_ID/ (share links)
  const shareMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (shareMatch && shareMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${shareMatch[1]}&sz=w1000`;
  }

  // Match ?id=FILE_ID or &id=FILE_ID (direct links like uc?export=view&id=...)
  const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch && queryMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${queryMatch[1]}&sz=w1000`;
  }

  return url;
}

/**
 * Removes common markdown syntax (bold, italic, links, etc.) from a string.
 * Useful for platforms like LinkedIn that don't natively support markdown.
 */
export function stripMarkdown(text: string): string {
  if (!text) return "";
  return text
    // Remove bold/italic (**text**, __text__, *text*, _text_)
    .replace(/(\*\*|__|\*|_)/g, "")
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove headers (# text)
    .replace(/^#+\s+/gm, "")
    // Remove horizontal rules
    .replace(/^-{3,}$/gm, "")
    // Clean up extra spaces/newlines that might result
    .trim();
}
