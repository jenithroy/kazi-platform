import { normalizeKey } from "@/supabase/functions/_shared/outreach/template";

// Reading prospect lists exported from spreadsheets, LinkedIn Sales Navigator, Apollo and the
// like: CSV parsing, guessing which column is which, and turning rows into prospects.

/** Parses CSV (comma, semicolon or tab separated; quoted fields may span lines). */
export function parseCsv(text) {
  const source = String(text ?? "").replace(/^﻿/, "");
  const delimiter = detectDelimiter(source);
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"' && field.trim() === "") {
      field = "";
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
  const [headers = [], ...body] = nonEmpty;
  return { headers: headers.map((header) => header.trim()), rows: body.map((cells) => cells.map((cell) => cell.trim())) };
}

function detectDelimiter(text) {
  const firstLine = text.slice(0, text.search(/\r|\n|$/));
  const counts = [",", ";", "\t"].map((delimiter) => [delimiter, firstLine.split(delimiter).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

export const IMPORT_FIELDS = [
  { key: "email", label: "Email", aliases: ["email", "e mail", "email address", "e mail address", "work email", "business email", "mail", "contact email"] },
  { key: "first_name", label: "First name", aliases: ["first name", "firstname", "first", "given name", "forename"] },
  { key: "last_name", label: "Last name", aliases: ["last name", "lastname", "surname", "family name", "last"] },
  { key: "full_name", label: "Full name (split into first and last)", aliases: ["name", "full name", "contact name", "contact", "person"] },
  { key: "company", label: "Company", aliases: ["company", "company name", "organisation", "organization", "brand", "brand name", "account", "account name", "business", "business name"] },
  { key: "title", label: "Job title", aliases: ["title", "job title", "position", "role", "job role", "job"] },
  { key: "website", label: "Website", aliases: ["website", "company website", "url", "website url", "domain", "company domain", "web", "site"] },
  { key: "phone", label: "Phone", aliases: ["phone", "phone number", "mobile", "mobile phone", "telephone", "tel", "work phone"] },
  { key: "linkedin_url", label: "LinkedIn URL", aliases: ["linkedin", "linkedin url", "linkedin profile", "person linkedin url", "linkedin link", "profile url"] },
  { key: "city", label: "City", aliases: ["city", "town", "location", "person city"] },
  { key: "country", label: "Country", aliases: ["country", "country name", "person country"] },
  { key: "tags", label: "Tags (comma separated)", aliases: ["tags", "tag", "labels", "segment", "list"] },
  { key: "notes", label: "Notes", aliases: ["notes", "note", "comments", "comment"] },
];

const FIELD_BY_ALIAS = new Map(IMPORT_FIELDS.flatMap((field) => field.aliases.map((alias) => [alias, field.key])));

const headerWords = (header) =>
  String(header)
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * A first guess at what each column holds: a field key from IMPORT_FIELDS, "custom" (kept as
 * {{column_name}} for emails) or "skip". Each field is only guessed for one column.
 */
export function guessMapping(headers) {
  const taken = new Set();
  return headers.map((header) => {
    const key = FIELD_BY_ALIAS.get(headerWords(header));
    if (key && !taken.has(key)) {
      taken.add(key);
      return key;
    }
    return normalizeKey(header) ? "custom" : "skip";
  });
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .replace(/^mailto:/i, "")
    .replace(/^<|>$/g, "")
    .toLowerCase();
}

export function isValidEmail(email) {
  return EMAIL.test(email) && email.length <= 254;
}

/** "ANNA" / "anna-marie" → "Anna" / "Anna-Marie"; mixed case ("McDonald") is left alone. */
export function tidyName(value) {
  const name = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!name || (name !== name.toUpperCase() && name !== name.toLowerCase())) return name;
  return name.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_, before, letter) => before + letter.toUpperCase());
}

export function splitTags(value) {
  return String(value ?? "")
    .split(/[,;|]/)
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Turns parsed rows into prospect records using a column mapping. Returns the prospects
 * (unique by email, first row wins), rows that were skipped with the reason, and how many
 * rows repeated an email already seen in the file.
 */
export function rowsToProspects({ headers, rows, mapping, tags = [], source = null }) {
  const prospects = [];
  const invalid = [];
  const seen = new Set();
  let duplicates = 0;

  rows.forEach((cells, index) => {
    const line = index + 2;
    const record = { fields: {}, tags: [...tags] };
    let fullName = "";
    mapping.forEach((target, column) => {
      const value = (cells[column] ?? "").trim();
      if (!value || target === "skip") return;
      if (target === "custom") {
        const key = normalizeKey(headers[column]);
        if (key) record.fields[key] = value;
      } else if (target === "full_name") {
        fullName = value;
      } else if (target === "tags") {
        record.tags.push(...splitTags(value));
      } else {
        record[target] = value;
      }
    });

    const email = normalizeEmail(record.email);
    if (!email) {
      invalid.push({ line, reason: "No email address" });
      return;
    }
    if (!isValidEmail(email)) {
      invalid.push({ line, reason: `“${record.email}” isn't a valid email address` });
      return;
    }
    if (seen.has(email)) {
      duplicates++;
      return;
    }
    seen.add(email);

    if (fullName && !record.first_name && !record.last_name) {
      const [first, ...rest] = fullName.trim().split(/\s+/);
      record.first_name = first;
      if (rest.length) record.last_name = rest.join(" ");
    }
    record.email = email;
    if (record.first_name) record.first_name = tidyName(record.first_name);
    if (record.last_name) record.last_name = tidyName(record.last_name);
    record.tags = [...new Set(record.tags)];
    if (source) record.source = source;
    prospects.push(record);
  });

  return { prospects, invalid, duplicates };
}
