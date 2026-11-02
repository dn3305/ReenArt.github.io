import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.ORACLE_UPLOAD_URL?.trim();
const token = process.env.ORACLE_UPLOAD_TOKEN?.trim();

if (!base || !token) {
  console.error('Set ORACLE_UPLOAD_URL and ORACLE_UPLOAD_TOKEN before running this migration.');
  process.exit(1);
}

const endpoint = new URL(base);
endpoint.pathname = `${endpoint.pathname.replace(/\/(?:upload|delete)\/?$/, '').replace(/\/$/, '')}/catalog`;

for (const name of ['paintings', 'sold']) {
  const content = await readFile(path.join(root, `${name}.csv`), 'utf8');
  const url = new URL(`${name}.csv`, `${endpoint.toString().replace(/\/$/, '')}/`);
  let response;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/csv; charset=utf-8' },
        body: content,
        signal: AbortSignal.timeout(120_000),
      });
      if (![408, 425, 429, 500, 502, 503, 504].includes(response.status) || attempt === 2) break;
      await response.body?.cancel();
    } catch (error) {
      lastError = error;
      if (attempt === 2) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
  }
  if (!response) throw lastError || new Error(`Upload failed for ${name}.csv.`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    console.error(`FAILED ${name}.csv: ${result.error || response.statusText}`);
    process.exitCode = 1;
    break;
  }
  console.log(`Migrated ${name}.csv to Oracle and Google Drive.`);
}
