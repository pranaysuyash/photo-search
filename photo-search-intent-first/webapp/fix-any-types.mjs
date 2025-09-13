#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Get all noExplicitAny errors
let output;
try {
	output = execSync(
		"npx @biomejs/biome check src --max-diagnostics=1000 2>&1",
		{ encoding: "utf8" },
	);
} catch (e) {
	// Biome exits with error when there are lint errors, but we still get the output
	output = e.stdout || e.output?.toString() || "";
}
const lines = output.split("\n");

const errors = [];
let currentFile = null;
let currentLine = null;

for (const line of lines) {
	const match = line.match(
		/^(src\/.*?):(\d+):(\d+) lint\/suspicious\/noExplicitAny/,
	);
	if (match) {
		currentFile = match[1];
		currentLine = parseInt(match[2]);
		errors.push({
			file: currentFile,
			line: currentLine,
			column: parseInt(match[3]),
		});
	}
}

// Group errors by file
const errorsByFile = {};
for (const error of errors) {
	if (!errorsByFile[error.file]) {
		errorsByFile[error.file] = [];
	}
	errorsByFile[error.file].push(error);
}

// Common type replacements
const typeReplacements = {
	"any[]": "unknown[]",
	any: "unknown",
	"(e: any)": "(e: Event)",
	"(error: any)": "(error: Error | unknown)",
	"(err: any)": "(err: Error | unknown)",
	"(data: any)": "(data: unknown)",
	"(value: any)": "(value: unknown)",
	"(item: any)": "(item: unknown)",
	"(result: any)": "(result: unknown)",
	"(response: any)": "(response: unknown)",
	"React.ChangeEvent<any>":
		"React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>",
	"React.MouseEvent<any>": "React.MouseEvent<HTMLElement>",
	"React.KeyboardEvent<any>": "React.KeyboardEvent<HTMLElement>",
	"Promise<any>": "Promise<unknown>",
	"Record<string, any>": "Record<string, unknown>",
	"as any": "as unknown",
};

// Process each file
for (const [filePath, fileErrors] of Object.entries(errorsByFile)) {
	try {
		const fullPath = path.resolve(filePath);
		let content = fs.readFileSync(fullPath, "utf8");

		// Apply common replacements
		for (const [pattern, replacement] of Object.entries(typeReplacements)) {
			// Create regex that matches the pattern as a whole word/type
			const regex = new RegExp(
				`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
				"g",
			);
			content = content.replace(regex, replacement);
		}

		// Special cases for function parameters
		content = content.replace(
			/\(([a-zA-Z_][a-zA-Z0-9_]*): any\)/g,
			"($1: unknown)",
		);
		content = content.replace(
			/\(([a-zA-Z_][a-zA-Z0-9_]*): any,/g,
			"($1: unknown,",
		);
		content = content.replace(
			/, ([a-zA-Z_][a-zA-Z0-9_]*): any\)/g,
			", $1: unknown)",
		);
		content = content.replace(
			/, ([a-zA-Z_][a-zA-Z0-9_]*): any,/g,
			", $1: unknown,",
		);

		// Handle type assertions
		content = content.replace(/ as any([^a-zA-Z])/g, " as unknown$1");

		// Handle generic types
		content = content.replace(/<any>/g, "<unknown>");
		content = content.replace(/<any,/g, "<unknown,");
		content = content.replace(/, any>/g, ", unknown>");
		content = content.replace(/, any,/g, ", unknown,");

		// Handle array types
		content = content.replace(/: any\[\]/g, ": unknown[]");

		// Handle return types
		content = content.replace(/\): any(\s|$|;|,|\))/g, "): unknown$1");

		// Handle interface/type definitions
		content = content.replace(/: any;/g, ": unknown;");
		content = content.replace(/: any,/g, ": unknown,");
		content = content.replace(/: any\s*$/gm, ": unknown");

		fs.writeFileSync(fullPath, content);
		console.log(`Fixed ${fileErrors.length} any types in ${filePath}`);
	} catch (error) {
		console.error(`Error processing ${filePath}:`, error.message);
	}
}

console.log(`\nProcessed ${Object.keys(errorsByFile).length} files`);
console.log(`Total any types found: ${errors.length}`);
