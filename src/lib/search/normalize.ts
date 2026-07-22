const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "on",
  "for",
  "to",
  "in",
  "of",
  "and",
  "my",
  "show",
  "open",
  "find",
  "search",
  "get",
  "list",
]);

export function normalizeQuery(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function tokenizeQuery(input: string): string[] {
  return normalizeQuery(input)
    .toLowerCase()
    .split(/[^a-z0-9&]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function phraseAfter(input: string, pattern: RegExp): string {
  const match = input.match(pattern);
  return match?.[1]?.trim() ?? "";
}

export function includesAllTerms(haystack: string, terms: string[]): boolean {
  const lower = haystack.toLowerCase();
  return terms.every((term) => lower.includes(term));
}

export function scoreTerms(haystack: string, terms: string[]): number {
  if (terms.length === 0) return 0;
  const lower = haystack.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (lower === term) score += 12;
    else if (lower.startsWith(term)) score += 8;
    else if (lower.includes(term)) score += 4;
  }
  return score;
}
