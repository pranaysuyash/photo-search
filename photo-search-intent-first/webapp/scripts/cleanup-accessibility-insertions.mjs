#!/usr/bin/env node

import fs from "node:fs";
import { glob } from "glob";

// Clean up bad insertions from an earlier accessibility pass
const files = await glob("src/**/*.{tsx,jsx}");

let fixed = 0;
for (const file of files) {
	let content = fs.readFileSync(file, "utf8");
	const orig = content;

	// 1) Fix inline handler corruption where '=> ...' became '= role="button" tabIndex={0}> ...'
	content = content.replaceAll('= role="button" tabIndex={0}>', "=>");

	// 2) Fix self-closing tags corrupted by ' / role="button" tabIndex={0}>'
	content = content.replaceAll(' / role="button" tabIndex={0}>', " />");

	if (content !== orig) {
		fs.writeFileSync(file, content);
		console.log(`Cleaned: ${file}`);
		fixed++;
	}
}

console.log(`Cleanup complete. Files fixed: ${fixed}`);
