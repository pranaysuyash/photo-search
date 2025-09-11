#!/usr/bin/env node

import fs from "node:fs";
import { glob } from "glob";

// Common type replacements for React and DOM events
const typeReplacements = [
	// React event handlers
	{ pattern: /\(e:\s*any\)/g, replacement: "(e: React.MouseEvent)" },
	{
		pattern: /\(event:\s*any\)/g,
		replacement: "(event: React.ChangeEvent<HTMLInputElement>)",
	},
	{ pattern: /\(ev:\s*any\)/g, replacement: "(ev: React.MouseEvent)" },

	// Error handling
	{ pattern: /\(error:\s*any\)/g, replacement: "(error: Error | unknown)" },
	{ pattern: /\(err:\s*any\)/g, replacement: "(err: Error | unknown)" },

	// Common data types
	{ pattern: /\(data:\s*any\)/g, replacement: "(data: unknown)" },
	{ pattern: /\(value:\s*any\)/g, replacement: "(value: string | number)" },
	{ pattern: /\(item:\s*any\)/g, replacement: "(item: unknown)" },
	{ pattern: /\(result:\s*any\)/g, replacement: "(result: unknown)" },
	{ pattern: /\(response:\s*any\)/g, replacement: "(response: unknown)" },

	// Array types
	{ pattern: /:\s*any\[\]/g, replacement: ": unknown[]" },
	{ pattern: /Array<any>/g, replacement: "Array<unknown>" },

	// Cast patterns - more specific
	{ pattern: /as\s+any(?=[\s;,)])/g, replacement: "as unknown" },

	// useState patterns
	{ pattern: /useState<any>/g, replacement: "useState<unknown>" },

	// Function parameters
	{
		pattern:
			/\(([a-zA-Z_][a-zA-Z0-9_]*):\s*any,\s*([a-zA-Z_][a-zA-Z0-9_]*):\s*any\)/g,
		replacement: "($1: unknown, $2: unknown)",
	},
];

// Process all TypeScript files
async function fixTypeScriptTypes() {
	const files = await glob("src/**/*.{ts,tsx}");
	let totalFixed = 0;
	const fixedFiles = [];

	for (const file of files) {
		let content = fs.readFileSync(file, "utf8");
		let modified = false;

		// Skip test files for now - they often need different handling
		if (file.includes(".test.") || file.includes(".spec.")) {
			continue;
		}

		// Apply each replacement pattern
		for (const { pattern, replacement } of typeReplacements) {
			const newContent = content.replace(pattern, replacement);
			if (newContent !== content) {
				content = newContent;
				modified = true;
			}
		}

		if (modified) {
			fs.writeFileSync(file, content);
			fixedFiles.push(file);
			totalFixed++;
		}
	}

	console.log(`Fixed TypeScript types in ${totalFixed} files:`);
	fixedFiles.forEach((f) => console.log(`  - ${f}`));

	return totalFixed;
}

// Fix array index keys in React components
async function fixArrayIndexKeys() {
	const files = await glob("src/**/*.{tsx,jsx}");
	let totalFixed = 0;

	for (const file of files) {
		const content = fs.readFileSync(file, "utf8");
		const _modified = false;

		// Pattern to find map with index as key
		// This is a simplified pattern - real fix would need AST parsing
		const mapPattern =
			/\.map\s*\(\s*\(([^,]+),\s*([^)]+)\)\s*=>\s*[^}]*key\s*=\s*\{\s*\2\s*\}/g;

		// Check if file has the pattern
		if (mapPattern.test(content)) {
			console.log(
				`Warning: ${file} may use array index as key - needs manual review`,
			);
			totalFixed++;
		}
	}

	return totalFixed;
}

// Main execution
console.log("🔧 Fixing TypeScript Type Errors\n");
console.log("Step 1: Replacing any types with proper types...");
const typesFixed = await fixTypeScriptTypes();

console.log("\nStep 2: Checking for array index keys...");
const keysToFix = await fixArrayIndexKeys();

console.log("\n✅ Summary:");
console.log(`- Fixed TypeScript types in ${typesFixed} files`);
console.log(`- Found ${keysToFix} files that may need manual key fixes`);
console.log('\nRun "npx @biomejs/biome check src" to see remaining issues');
