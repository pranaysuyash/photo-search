#!/usr/bin/env node

import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find all TypeScript/React files
function findFiles(dir) {
	let results = [];
	const files = fs.readdirSync(dir);

	for (const file of files) {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);

		if (
			stat.isDirectory() &&
			!file.includes("node_modules") &&
			!file.includes(".git")
		) {
			results = results.concat(findFiles(filePath));
		} else if (
			stat.isFile() &&
			(file.endsWith(".tsx") || file.endsWith(".jsx"))
		) {
			results.push(filePath);
		}
	}

	return results;
}

// Fix button type issues
function fixButtonTypes(filePath) {
	let content = fs.readFileSync(filePath, "utf8");
	let modified = false;
	const originalContent = content;

	// Pattern 1: <button without type attribute
	// Match <button followed by any attributes but no type=
	const buttonRegex = /<button\s+(?![^>]*\btype=)([^>]*)>/g;

	content = content.replace(buttonRegex, (match, attrs) => {
		modified = true;
		return `<button type="button" ${attrs}>`;
	});

	// Pattern 2: Multi-line button elements
	const lines = content.split("\n");
	let inButton = false;
	let buttonStartLine = -1;
	let hasType = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Detect button start
		if (line.match(/<button(?:\s|$)/)) {
			inButton = true;
			buttonStartLine = i;
			hasType = false;

			// Check if this line has type
			if (line.includes("type=")) {
				hasType = true;
			}
		}

		if (inButton) {
			// Check for type attribute
			if (line.includes("type=")) {
				hasType = true;
			}

			// Detect button tag close
			if (line.includes(">")) {
				if (!hasType) {
					// Add type="button" after <button
					modified = true;
					lines[buttonStartLine] = lines[buttonStartLine].replace(
						/(<button)(\s|$)/,
						'$1 type="button"$2',
					);
				}
				inButton = false;
			}
		}
	}

	if (modified) {
		content = lines.join("\n");
	}

	if (content !== originalContent) {
		fs.writeFileSync(filePath, content);
		console.log(
			`Fixed button types in: ${path.relative(process.cwd(), filePath)}`,
		);
		return 1;
	}

	return 0;
}

// Main execution
const srcDir = path.join(__dirname, "src");
const files = findFiles(srcDir);

console.log(`Found ${files.length} React files`);

let totalFixed = 0;
for (const file of files) {
	totalFixed += fixButtonTypes(file);
}

console.log(`\nFixed button types in ${totalFixed} files`);
