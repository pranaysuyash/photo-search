#!/usr/bin/env node

import fs from "node:fs";
import { glob } from "glob";

// Revert accidental </nav> closings back to </div> in TSX/JSX files
const files = await glob("src/**/*.{tsx,jsx}");

let touched = 0;
for (const file of files) {
	const content = fs.readFileSync(file, "utf8");
	if (content.includes("</nav>")) {
		const reverted = content.replaceAll("</nav>", "</div>");
		if (reverted !== content) {
			fs.writeFileSync(file, reverted);
			touched++;
			console.log(`Reverted </nav> in: ${file}`);
		}
	}
}

console.log(`Done. Updated ${touched} files.`);
