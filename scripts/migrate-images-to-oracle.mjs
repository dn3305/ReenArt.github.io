import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imagesDirectory = path.join(root, 'public', 'images');
const endpoint = process.env.ORACLE_UPLOAD_URL;
const token = process.env.ORACLE_UPLOAD_TOKEN;

if (!endpoint || !token) {
  console.error('Set ORACLE_UPLOAD_URL and ORACLE_UPLOAD_TOKEN before running this migration.');
  process.exit(1);
}

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const filenames = (await readdir(imagesDirectory, { withFileTypes: true }))
  .filter(entry => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
  .map(entry => entry.name)
  .sort((a, b) => a.localeCompare(b));

let failures = 0;
for (const filename of filenames) {
  const bytes = await readFile(path.join(imagesDirectory, filename));
  const body = new FormData();
  body.append('filename', filename);
  body.append('file', new Blob([bytes]), filename);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
      signal: AbortSignal.timeout(120_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success !== true) {
      failures++;
      console.error(`FAILED ${filename}: ${result.error || response.statusText}`);
    } else {
      console.log(`Copied ${filename} to Oracle and Drive`);
    }
  } catch (error) {
    failures++;
    console.error(`FAILED ${filename}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`Finished: ${filenames.length - failures}/${filenames.length} images copied.`);
if (failures) process.exitCode = 1;
