// Builds the raw RFC 5322 message the Gmail API sends. Outreach email goes out as plain
// text — it reads like a personal note, and plain text is what lands in the inbox.

const encoder = new TextEncoder();

export type Address = { name?: string | null; email: string };

const PRINTABLE_ASCII = /^[\x20-\x7e]*$/;
const NEEDS_QUOTES = /[()<>@,;:\\".[\]]/;

// Nothing user-supplied (names, subjects) may carry a line break into the header block.
const oneLine = (value: string) => value.replace(/\s*[\r\n]+\s*/g, " ").trim();

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function toBase64Url(text: string): string {
  return base64(encoder.encode(text)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** RFC 2047 encoded words, split on character boundaries so each stays within 75 chars. */
export function encodeWords(text: string): string {
  const words: string[] = [];
  let chunk = "";
  for (const char of text) {
    if (encoder.encode(chunk + char).length > 45) {
      words.push(chunk);
      chunk = "";
    }
    chunk += char;
  }
  if (chunk) words.push(chunk);
  return words.map((word) => `=?UTF-8?B?${base64(encoder.encode(word))}?=`).join("\r\n ");
}

/**
 * Folds a long header line at spaces so no line exceeds 78 characters where possible.
 * Encoded words come pre-folded and are left alone.
 */
export function foldHeader(line: string): string {
  if (line.length <= 78 || line.includes("\r\n")) return line;
  const [name, ...parts] = line.split(" ");
  const lines: string[] = [];
  let current = name;
  for (const part of parts) {
    // The first value stays on the header's own line, however long.
    if (current !== name && current.length + 1 + part.length > 78) {
      lines.push(current);
      current = ` ${part}`;
    } else {
      current += ` ${part}`;
    }
  }
  lines.push(current);
  return lines.join("\r\n");
}

export function encodeHeaderValue(value: string): string {
  const clean = oneLine(value);
  return PRINTABLE_ASCII.test(clean) ? clean : encodeWords(clean);
}

export function formatAddress({ name, email }: Address): string {
  const address = oneLine(email);
  const display = oneLine(name ?? "");
  if (!display) return address;
  if (!PRINTABLE_ASCII.test(display)) return `${encodeWords(display)} <${address}>`;
  return NEEDS_QUOTES.test(display) ? `"${display.replace(/(["\\])/g, "\\$1")}" <${address}>` : `${display} <${address}>`;
}

/** Quoted-printable (RFC 2045) for a UTF-8 body: lines of at most 76 characters. */
export function quotedPrintable(text: string): string {
  const hex = (byte: number) => `=${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      const bytes = encoder.encode(line);
      let out = "";
      let length = 0;
      bytes.forEach((byte, index) => {
        const last = index === bytes.length - 1;
        const literal = (byte >= 33 && byte <= 126 && byte !== 61) || ((byte === 32 || byte === 9) && !last);
        const piece = literal ? String.fromCharCode(byte) : hex(byte);
        if (length + piece.length > 75) {
          out += "=\r\n";
          length = 0;
        }
        out += piece;
        length += piece.length;
      });
      return out;
    })
    .join("\r\n");
}

export type MessageOptions = {
  from: Address;
  to: Address;
  subject: string;
  body: string;
  inReplyTo?: string | null;
  references?: string[] | null;
  headers?: Record<string, string>;
  date?: Date;
};

export function buildMessage({ from, to, subject, body, inReplyTo, references, headers = {}, date = new Date() }: MessageOptions): string {
  const lines = [
    `From: ${formatAddress(from)}`,
    `To: ${formatAddress(to)}`,
    foldHeader(`Subject: ${encodeHeaderValue(subject)}`),
    `Date: ${date.toUTCString().replace(/GMT$/, "+0000")}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: quoted-printable",
  ];
  if (inReplyTo) lines.push(`In-Reply-To: ${oneLine(inReplyTo)}`);
  if (references?.length) lines.push(foldHeader(`References: ${references.map(oneLine).join(" ")}`));
  for (const [name, value] of Object.entries(headers)) lines.push(foldHeader(`${name}: ${oneLine(value)}`));
  return `${lines.join("\r\n")}\r\n\r\n${quotedPrintable(body)}`;
}
