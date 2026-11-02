function filenamesFromCsv(value: string | undefined): string[] {
  return (value || '').split(',').map((entry) => {
    const clean = entry.trim().split(/[?#]/, 1)[0];
    return clean.split('/').pop() || '';
  }).filter((name) => /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:jpe?g|png|webp|gif)$/i.test(name));
}

export function imagesRemovedFromCatalog(previous: string, currentRows: string[][]): string[] {
  const stillReferenced = new Set(currentRows.flatMap((row) => filenamesFromCsv(row[8])));
  return [...new Set(filenamesFromCsv(previous))].filter((filename) => !stillReferenced.has(filename));
}

export async function deleteOracleImages(filenames: string[]): Promise<boolean> {
  if (!filenames.length) return true;
  const uploadUrl = process.env.ORACLE_UPLOAD_URL?.trim();
  const token = process.env.ORACLE_UPLOAD_TOKEN?.trim();
  if (!uploadUrl || !token) return false;

  const deleteUrl = new URL(uploadUrl);
  deleteUrl.pathname = deleteUrl.pathname.replace(/\/upload\/?$/, '/delete');
  if (deleteUrl.pathname === new URL(uploadUrl).pathname) {
    throw new Error('ORACLE_UPLOAD_URL must end with /upload to support image deletion.');
  }

  const response = await fetch(deleteUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filenames }),
    cache: 'no-store',
    signal: AbortSignal.timeout(60_000),
  });
  const result = await response.json().catch(() => ({}));
  return response.ok && result.success === true;
}
