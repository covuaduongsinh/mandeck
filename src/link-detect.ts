// Link detection for terminal buffers (D1 ⌘-click). Three shapes match:
// scheme URLs (http/https, always), scheme-less hosts (only against the
// curated TLD list below — so file names like main.ts, README.md, or
// state.json never light up; .md and .ts ARE real ccTLDs and are excluded
// on purpose), and localhost/IPv4 (which require an explicit port, the
// dev-server convention).

const TLDS = [
  "com", "org", "net", "io", "dev", "app", "ai", "co", "sh", "me", "gg",
  "so", "to", "tv", "cc", "fm", "im", "is", "xyz", "info", "edu", "gov",
  "vn", "uk", "de", "fr", "jp", "us", "ca", "au", "in", "br", "kr", "tw",
  "sg", "nl", "se", "ch", "es", "it", "pl", "eu", "cloud", "site", "tech",
  "online", "live", "run", "link", "page", "pro", "fyi", "chat", "news",
  "email", "tools", "world", "today", "store", "blog", "space", "systems",
  "zone", "plus", "host", "design", "wiki", "lol", "codes", "studio",
];

const PATH_CHARS = `[^\\s<>"'\`)\\]]`;
const SCHEME_URL = `https?:\\/\\/${PATH_CHARS}+`;
const BARE_HOST =
  `(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+` +
  `(?:${TLDS.join("|")})(?![\\w-])` +
  `(?::\\d{2,5})?(?:\\/${PATH_CHARS}*)?`;
const LOCAL_HOST =
  `(?:localhost|\\d{1,3}(?:\\.\\d{1,3}){3}):\\d{2,5}(?:\\/${PATH_CHARS}*)?`;

// The lookbehind keeps hosts inside emails (user@host.com) and dotted
// continuations from matching mid-token.
const LINK_RE = new RegExp(
  `(?<![\\w@.-])(?:${SCHEME_URL}|${BARE_HOST}|${LOCAL_HOST})`,
  "gi"
);

export type DetectedLink = {
  start: number; // index of first char in the source text
  end: number; // index of last char (inclusive)
  text: string; // the matched run as printed
  url: string; // normalized, openable form
};

function normalizeUrl(raw: string): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  // localhost / bare IPv4 dev servers are http, not https.
  if (/^(?:localhost|\d)/i.test(raw)) return `http://${raw}`;
  return `https://${raw}`;
}

export function findLinks(text: string): DetectedLink[] {
  const out: DetectedLink[] = [];
  LINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LINK_RE.exec(text)) !== null) {
    // Trailing sentence punctuation belongs to the prose, not the URL.
    const trimmed = m[0].replace(/[.,;:!?'"”’]+$/, "");
    if (!trimmed) continue;
    out.push({
      start: m.index,
      end: m.index + trimmed.length - 1,
      text: trimmed,
      url: normalizeUrl(trimmed),
    });
  }
  return out;
}
