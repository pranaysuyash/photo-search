#!/usr/bin/env node

const fs = require("node:fs");
const _path = require("node:path");
const glob = require("glob");

// Fix button type errors
function fixButtonTypes(content) {
	// Add type="button" to buttons without type attribute
	// Match <button with optional attributes but no type attribute
	const buttonRegex = /<button\s+(?![^>]*\btype\s*=)([^>]*)>/g;

	return content.replace(buttonRegex, (match, attrs) => {
		// Skip if it already has type attribute
		if (attrs.includes("type=")) return match;

		// Add type="button" as the first attribute
		return `<button type="button" ${attrs}>`;
	});
}

// Process all TypeScript React files
const files = glob.sync("src/**/*.tsx");

files.forEach((file) => {
	const content = fs.readFileSync(file, "utf8");
	const fixed = fixButtonTypes(content);

	if (content !== fixed) {
		fs.writeFileSync(file, fixed);
		console.log(`Fixed buttons in: ${file}`);
	}
});

console.log("Button type fixes complete!");
