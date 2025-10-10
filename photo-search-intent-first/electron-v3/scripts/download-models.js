const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const fsp = fs.promises;

const projectRoot = path.resolve(__dirname, "..", "..");
const templatePath = path.join(
  projectRoot,
  "electron",
  "models",
  "manifest.template.json"
);
const sourceRoot = path.join(projectRoot, "electron", "models", "source");
const targetRoot = path.join(__dirname, "..", "models");

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function pathExists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyDirectory(src, dest) {
  await ensureDir(dest);
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      await fsp.copyFile(srcPath, destPath);
    }
  }
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function gatherFiles(dir, baseDir = dir) {
  const out = [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await gatherFiles(entryPath, baseDir)));
    } else if (entry.isFile()) {
      const stats = await fsp.stat(entryPath);
      const hash = await sha256File(entryPath);
      const relative = path
        .relative(baseDir, entryPath)
        .split(path.sep)
        .join("/");
      out.push({ path: relative, size: stats.size, sha256: hash });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

async function installModels() {
  if (!(await pathExists(templatePath))) {
    throw new Error(`Missing manifest template at ${templatePath}`);
  }
  const template = JSON.parse(await fsp.readFile(templatePath, "utf-8"));

  if (!Array.isArray(template) || template.length === 0) {
    throw new Error("Manifest template is empty; nothing to bundle");
  }

  await ensureDir(targetRoot);

  const models = [];

  for (const model of template) {
    const sourceDir = path.join(sourceRoot, model.local_name);
    if (!(await pathExists(sourceDir))) {
      throw new Error(
        `Source assets for ${model.local_name} not found. Expected directory ${sourceDir}`
      );
    }

    const destinationDir = path.join(targetRoot, model.local_name);
    await fsp.rm(destinationDir, { recursive: true, force: true });
    await copyDirectory(sourceDir, destinationDir);

    const files = await gatherFiles(destinationDir);
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

    models.push({
      name: model.local_name,
      repo: model.repo_id,
      description: model.description || "",
      files,
      totalBytes,
    });

    console.log(
      `Prepared ${model.local_name} (${files.length} files, ${totalBytes} bytes)`
    );
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    models,
  };

  await fsp.writeFile(
    path.join(targetRoot, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`\nManifest written to ${path.join(targetRoot, "manifest.json")}`);
}

async function verifyModels() {
  const manifestPath = path.join(targetRoot, "manifest.json");
  if (!(await pathExists(manifestPath))) {
    throw new Error(`Manifest not found at ${manifestPath}. Run without --verify first.`);
  }

  const manifest = JSON.parse(await fsp.readFile(manifestPath, "utf-8"));
  const discrepancies = [];

  for (const model of manifest.models || []) {
    const modelDir = path.join(targetRoot, model.name);
    if (!(await pathExists(modelDir))) {
      discrepancies.push(`Missing model directory: ${model.name}`);
      continue;
    }

    const currentFiles = await gatherFiles(modelDir);
    const expected = new Map(model.files.map((file) => [file.path, file]));

    for (const file of currentFiles) {
      const expectedFile = expected.get(file.path);
      if (!expectedFile) {
        discrepancies.push(`Unexpected file in ${model.name}: ${file.path}`);
        continue;
      }
      if (expectedFile.sha256 !== file.sha256) {
        discrepancies.push(
          `Hash mismatch for ${model.name}/${file.path}. Expected ${expectedFile.sha256}, found ${file.sha256}`
        );
      }
      if (expectedFile.size !== file.size) {
        discrepancies.push(
          `Size mismatch for ${model.name}/${file.path}. Expected ${expectedFile.size}, found ${file.size}`
        );
      }
      expected.delete(file.path);
    }

    for (const missing of expected.values()) {
      discrepancies.push(`Missing file for ${model.name}: ${missing.path}`);
    }
  }

  if (discrepancies.length > 0) {
    console.error("Model verification failed:");
    for (const issue of discrepancies) {
      console.error(`  - ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("All bundled models passed integrity verification.");
}

async function main() {
  const verifyOnly = process.argv.includes("--verify");
  try {
    if (verifyOnly) {
      await verifyModels();
    } else {
      await installModels();
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

main();
