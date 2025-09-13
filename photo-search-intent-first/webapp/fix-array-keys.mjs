#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Get all noArrayIndexKey errors
let output;
try {
	output = execSync(
		"npx @biomejs/biome check src --max-diagnostics=1000 2>&1",
		{ encoding: "utf8" },
	);
} catch (e) {
	output = e.stdout || e.output?.toString() || "";
}

const lines = output.split("\n");
const errors = [];

for (let i = 0; i < lines.length; i++) {
	const line = lines[i];
	if (line.includes("lint/suspicious/noArrayIndexKey")) {
		// Get the file path from the line before
		const match = line.match(/^(src\/.*?):(\d+):(\d+)/);
		if (match) {
			errors.push({
				file: match[1],
				line: parseInt(match[2]),
				column: parseInt(match[3]),
			});
		}
	}
}

console.log(`Found ${errors.length} noArrayIndexKey errors to fix`);

// Process each error
for (const error of errors) {
	try {
		const fullPath = path.resolve(error.file);
		const content = fs.readFileSync(fullPath, "utf8");
		const lines = content.split("\n");
		const lineIndex = error.line - 1;

		if (lineIndex >= 0 && lineIndex < lines.length) {
			let line = lines[lineIndex];

			// Fix various key patterns - use the item itself when possible
			line = line.replace(
				/key={[`"']?[^}]*\${?(index|idx|i)\}?[^}]*[`"']?}/g,
				(match) => {
					// Extract what's being mapped
					const prevLines = lines
						.slice(Math.max(0, lineIndex - 10), lineIndex)
						.join("\n");
					const mapMatch = prevLines.match(/\.map\(\(([^,\s]+)/);

					if (mapMatch) {
						const item = mapMatch[1];
						// Use a unique property of the item
						return `key={\`item-\${String(${item})}\`}`;
					}
					return match;
				},
			);

			lines[lineIndex] = line;
		}

		fs.writeFileSync(fullPath, lines.join("\n"));
	} catch (error) {
		console.error(`Error fixing ${error.file}:${error.line}:`, error.message);
	}
}

console.log("Done!");
