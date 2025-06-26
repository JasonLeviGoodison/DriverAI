import {
  UnknownObject,
  SanitizableMessage,
  ComputerCallOutputResponse,
} from "./types";

// Blocked domains for URL safety checks
const BLOCKED_DOMAINS = [
  "maliciousbook.com",
  "evilvideos.com",
  "darkwebforum.com",
  "shadytok.com",
  "suspiciouspins.com",
  "ilanbigio.com",
];

// Pretty-print an object as JSON
export function pp(obj: unknown): void {
  console.log(JSON.stringify(obj, null, 4));
}

// Show a base64-encoded PNG image (Node: prints info, browser: opens image)
export function showImage(base64: string): void {
  // In Node.js, we can't open an image window, so just print info
  // In browser, open in new tab
  if (typeof window !== "undefined") {
    const img = new window.Image();
    img.src = `data:image/png;base64,${base64}`;
    const w = window.open("");
    if (w) {
      w.document.write(img.outerHTML);
    }
  } else {
    console.log("Image display requested (base64 length:", base64.length, ")");
  }
}

// Calculate image dimensions from base64 PNG (requires browser or Node canvas)
export function calculateImageDimensions(base64: string): { width: number; height: number } {
  // Node.js: use 'canvas' if available, else fallback
  // Browser: use Image
  if (typeof window !== "undefined") {
    return new Promise<{ width: number; height: number }>((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.src = `data:image/png;base64,${base64}`;
    }) as any;
  } else {
    // Node.js fallback: return default
    return { width: 800, height: 600 };
  }
}

// Sanitize a message by omitting image_url for computer_call_output
export function sanitizeMessage(msg: SanitizableMessage): SanitizableMessage {
  if (msg && msg.type === "computer_call_output") {
    const output = msg.output || {};
    if (typeof output === "object" && output !== null) {
      return {
        ...msg,
        output: { ...output, image_url: "[omitted]" },
      };
    }
  }
  return msg;
}


// Check if a URL is blocklisted
export function checkBlocklistedUrl(url: string): void {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname || "";
    const isBlocked = BLOCKED_DOMAINS.some(
      (blockedDomain) => hostname === blockedDomain || hostname.endsWith(`.${blockedDomain}`)
    );
    if (isBlocked) {
      throw new Error(`Blocked URL: ${url}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("Blocked URL:")) {
      throw error;
    }
    // Invalid URL format, let it pass through
  }
}

// Convert base64 string to Buffer
export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, "base64");
}

// Convert Buffer to base64 string
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

// Format a base64 string as a PNG data URL
export function formatImageDataUrl(base64: string): string {
  return `data:image/png;base64,${base64}`;
}
