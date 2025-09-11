#!/usr/bin/env node

import fs from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find all TypeScript/React files
function findFiles(dir, ext) {
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
			results = results.concat(findFiles(filePath, ext));
		} else if (
			stat.isFile() &&
			(file.endsWith(".tsx") || file.endsWith(".ts"))
		) {
			results.push(filePath);
		}
	}

	return results;
}

// Fix accessibility issues in a file
function fixAccessibility(filePath) {
	let content = fs.readFileSync(filePath, "utf8");
	let modified = false;
	const originalContent = content;

	// Pattern 1: div/span with onClick but no keyboard handlers
	// Look for patterns like: onClick={...} but no onKeyDown/onKeyPress
	const divWithOnClick =
		/<(div|span|button|a)([^>]*?)onClick={([^}]+)}([^>]*?)>/g;

	content = content.replace(
		divWithOnClick,
		(match, tag, beforeClick, clickHandler, afterClick) => {
			// Check if it already has keyboard handlers or role="button"
			if (
				match.includes("onKeyDown") ||
				match.includes("onKeyPress") ||
				match.includes("onKeyUp")
			) {
				return match;
			}

			// Check if it has role="button" and tabIndex
			const hasRole =
				match.includes('role="button"') || match.includes("role='button'");
			const hasTabIndex = match.includes("tabIndex");

			if (tag === "button" || tag === "a") {
				// Buttons and anchors are naturally keyboard accessible
				return match;
			}

			if (hasRole && hasTabIndex) {
				// Add onKeyDown handler
				modified = true;
				const keyHandler = `onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ${clickHandler}; } }}`;
				return `<${tag}${beforeClick}onClick={${clickHandler}}${afterClick} ${keyHandler}>`;
			}

			if (!hasRole || !hasTabIndex) {
				// Add role and tabIndex if missing
				modified = true;
				let additions = "";
				if (!hasRole) additions += ' role="button"';
				if (!hasTabIndex) additions += " tabIndex={0}";
				const keyHandler = `onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ${clickHandler}; } }}`;
				return `<${tag}${beforeClick}onClick={${clickHandler}}${afterClick}${additions} ${keyHandler}>`;
			}

			return match;
		},
	);

	// Pattern 2: JSX elements with onClick in multiline format
	const lines = content.split("\n");
	let inComponent = false;
	let componentStartLine = -1;
	let componentIndent = "";
	let hasOnClick = false;
	let hasKeyHandler = false;
	let hasRole = false;
	let hasTabIndex = false;
	let clickHandler = "";

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Detect component start
		if (
			line.match(
				/<(div|span|li|article|section|aside|header|footer|main|nav)\s*$/,
			)
		) {
			inComponent = true;
			componentStartLine = i;
			componentIndent = line.match(/^\s*/)[0];
			hasOnClick = false;
			hasKeyHandler = false;
			hasRole = false;
			hasTabIndex = false;
			clickHandler = "";
		}

		if (inComponent) {
			// Check for onClick
			if (line.includes("onClick=")) {
				hasOnClick = true;
				const match = line.match(/onClick={(.*?)}/);
				if (match) {
					clickHandler = match[1];
				} else {
					// Multi-line onClick
					const startMatch = line.match(/onClick={(.*)$/);
					if (startMatch) {
						clickHandler = startMatch[1];
						// Look for closing brace
						for (let j = i + 1; j < lines.length; j++) {
							clickHandler += ` ${lines[j].trim()}`;
							if (lines[j].includes("}")) {
								clickHandler = clickHandler.replace(/}.*$/, "");
								break;
							}
						}
					}
				}
			}

			// Check for keyboard handlers
			if (line.match(/onKey(Down|Press|Up)=/)) {
				hasKeyHandler = true;
			}

			// Check for role
			if (line.match(/role=["']button["']/)) {
				hasRole = true;
			}

			// Check for tabIndex
			if (line.includes("tabIndex=")) {
				hasTabIndex = true;
			}

			// Detect component end
			if (line.includes(">") && !line.includes("/>")) {
				if (hasOnClick && !hasKeyHandler) {
					modified = true;

					// Add missing attributes
					const additions = [];
					if (!hasRole) {
						// Insert role="button" after the tag name
						for (let j = componentStartLine; j <= i; j++) {
							if (
								lines[j].match(
									/<(div|span|li|article|section|aside|header|footer|main|nav)/,
								)
							) {
								lines[j] = lines[j].replace(
									/(<(?:div|span|li|article|section|aside|header|footer|main|nav))/,
									'$1 role="button"',
								);
								hasRole = true;
								break;
							}
						}
					}

					if (!hasTabIndex) {
						additions.push(`${componentIndent}\ttabIndex={0}`);
					}

					if (!hasKeyHandler && clickHandler) {
						additions.push(`${componentIndent}\tonKeyDown={(e) => {`);
						additions.push(
							`${componentIndent}\t\tif (e.key === 'Enter' || e.key === ' ') {`,
						);
						additions.push(`${componentIndent}\t\t\te.preventDefault();`);
						additions.push(`${componentIndent}\t\t\t${clickHandler};`);
						additions.push(`${componentIndent}\t\t}`);
						additions.push(`${componentIndent}\t}}`);
					}

					// Insert additions before the closing >
					if (additions.length > 0) {
						lines.splice(i, 0, ...additions);
						i += additions.length;
					}
				}

				inComponent = false;
			}
		}
	}

	if (lines.join("\n") !== originalContent) {
		content = lines.join("\n");
		modified = true;
	}

	if (modified) {
		fs.writeFileSync(filePath, content);
		console.log(
			`Fixed accessibility in: ${path.relative(process.cwd(), filePath)}`,
		);
		return 1;
	}

	return 0;
}

// Main execution
const srcDir = path.join(__dirname, "src");
const files = findFiles(srcDir, ".tsx");

console.log(`Found ${files.length} TypeScript/React files`);

let totalFixed = 0;
for (const file of files) {
	totalFixed += fixAccessibility(file);
}

console.log(`\nFixed accessibility issues in ${totalFixed} files`);
