const TOKEN_RE =
	/\b(camera|tag|person|has_text|iso|fnumber|width|height|place):[^\s]+/gi;

export function stripFilterTokens(text: string): string {
	return text
		.replace(TOKEN_RE, "")
		.replace(/\s{2,}/g, " ")
		.trim();
}
