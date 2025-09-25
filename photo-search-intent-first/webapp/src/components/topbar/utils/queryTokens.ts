const STRUCTURED_TOKEN_REGEX = /\b(camera|tag|person|has_text|iso|fnumber|width|height|place):[^\s]+/gi;

export function appendTokenToQuery(query: string, token: string): string {
  const base = query.trim();
  return base ? `${base} ${token}` : token;
}

export function stripStructuredTokens(query: string): string {
  return query
    .replace(STRUCTURED_TOKEN_REGEX, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
