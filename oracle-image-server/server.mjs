import { createServer } from 'node:http';
import { mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const port = Number(process.env.PORT || 8090);
const imageDirectory = process.env.IMAGE_STORAGE_DIR || '/var/www/reenart-images';
const uploadToken = process.env.IMAGE_STORAGE_TOKEN || '';
const driveDestination = process.env.RCLONE_DESTINATION || '';
const maxBytes = Number(process.env.MAX_IMAGE_BYTES || 20 * 1024 * 1024);
const catalogDirectory = path.join(imageDirectory, 'catalog');
let catalogMutation = Promise.resolve();

function serializeCatalogMutation(operation) {
  const result = catalogMutation.then(operation);
  catalogMutation = result.catch(() => {});
  return result;
}

function parseCsv(content) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i], next = content[i + 1];
    if (quoted && char === '"' && next === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ',') { row.push(cell); cell = ''; }
    else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); if (row.some((value) => value !== '')) rows.push(row); }
  return rows;
}

function serializeCsv(rows) {
  return rows.map((row) => row.map((value) => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(',')).join('\n');
}

async function backupCatalog(name, sourcePath) {
  const driveBase = `${driveDestination.replace(/\/+$/, '')}/catalog`;
  await execFileAsync('rclone', ['copyto', sourcePath, `${driveBase}/${name}.csv`, '--no-traverse', '--retries', '3', '--retries-sleep', '2s', '--low-level-retries', '10'], { timeout: 180_000 });
}

function sendJson(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(value));
}

function authorized(header = '') {
  const supplied = header.startsWith('Bearer ') ? Buffer.from(header.slice(7)) : Buffer.alloc(0);
  const expected = Buffer.from(uploadToken);
  return Boolean(expected.length && supplied.length === expected.length && timingSafeEqual(supplied, expected));
}

function safeFilename(value) {
  return typeof value === 'string' &&
    value.length <= 180 &&
    path.basename(value) === value &&
    /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:jpe?g|png|webp|gif)$/i.test(value);
}

async function handleUpload(request, response) {
  if (!uploadToken || !driveDestination) {
    return sendJson(response, 503, { success: false, error: 'Image storage or Google Drive backup is not configured.' });
  }
  if (!authorized(request.headers.authorization)) {
    return sendJson(response, 401, { success: false, error: 'Unauthorized.' });
  }
  const contentLength = Number(request.headers['content-length'] || 0);
  if (contentLength > maxBytes + 1024 * 1024) {
    return sendJson(response, 413, { success: false, error: 'Image is too large.' });
  }

  let temporaryPath;
  try {
    const webRequest = new Request(`http://${request.headers.host || 'localhost'}${request.url}`, {
      method: request.method,
      headers: request.headers,
      body: request,
      duplex: 'half',
    });
    const form = await webRequest.formData();
    const file = form.get('file');
    const filename = form.get('filename');
    if (!(file instanceof File) || !safeFilename(filename)) {
      return sendJson(response, 400, { success: false, error: 'A supported image file and safe filename are required.' });
    }
    if (file.size <= 0 || file.size > maxBytes) {
      return sendJson(response, 413, { success: false, error: 'Image must be between 1 byte and 20 MB.' });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    await mkdir(imageDirectory, { recursive: true });
    const finalPath = path.join(imageDirectory, filename);
    temporaryPath = `${finalPath}.${process.pid}.upload`;
    await writeFile(temporaryPath, bytes, { flag: 'wx' });
    await rename(temporaryPath, finalPath);
    temporaryPath = undefined;

    const target = `${driveDestination.replace(/\/+$/, '')}/${filename}`;
    await execFileAsync('rclone', ['copyto', finalPath, target, '--no-traverse', '--retries', '3', '--retries-sleep', '2s', '--low-level-retries', '10'], { timeout: 180_000 });
    return sendJson(response, 200, { success: true, filename, backup: 'complete' });
  } catch (error) {
    if (temporaryPath) await rm(temporaryPath, { force: true }).catch(() => {});
    console.error('Image upload or Drive backup failed:', error);
    return sendJson(response, 502, {
      success: false,
      error: 'The image was received, but saving it to Google Drive failed. Retry the upload after checking the Oracle backup service.',
    });
  }
}

async function handleDelete(request, response) {
  if (!uploadToken || !driveDestination) {
    return sendJson(response, 503, { success: false, error: 'Image storage or Google Drive backup is not configured.' });
  }
  if (!authorized(request.headers.authorization)) {
    return sendJson(response, 401, { success: false, error: 'Unauthorized.' });
  }

  try {
    const body = await new Promise((resolve, reject) => {
      let data = '';
      request.setEncoding('utf8');
      request.on('data', chunk => {
        data += chunk;
        if (data.length > 16_384) reject(new Error('Request body is too large.'));
      });
      request.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON body.')); }
      });
      request.on('error', reject);
    });

    const filenames = Array.isArray(body?.filenames) ? [...new Set(body.filenames)] : [];
    if (!filenames.length || filenames.length > 100 || filenames.some(name => !safeFilename(name))) {
      return sendJson(response, 400, { success: false, error: 'Provide 1 to 100 safe image filenames.' });
    }

    for (const filename of filenames) {
      const localPath = path.join(imageDirectory, filename);
      await execFileAsync('rclone', ['deletefile', `${driveDestination.replace(/\/+$/, '')}/${filename}`], { timeout: 120_000 });
      await unlink(localPath).catch(error => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
    return sendJson(response, 200, { success: true, deleted: filenames });
  } catch (error) {
    console.error('Image deletion failed:', error);
    return sendJson(response, 502, { success: false, error: 'Could not remove one or more images from Oracle and Google Drive.' });
  }
}

async function readBody(request, maxLength = 2 * 1024 * 1024) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    let length = 0;
    request.on('data', (chunk) => {
      length += chunk.length;
      if (length > maxLength) {
        reject(Object.assign(new Error('Request body is too large.'), { statusCode: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

async function handleCatalog(request, response, name) {
  if (!uploadToken || !driveDestination) {
    return sendJson(response, 503, { success: false, error: 'Catalog storage or Google Drive backup is not configured.' });
  }
  if (!authorized(request.headers.authorization)) {
    return sendJson(response, 401, { success: false, error: 'Unauthorized.' });
  }

  const filename = `${name}.csv`;
  const finalPath = path.join(catalogDirectory, filename);
  let temporaryPath;
  try {
    if (request.method === 'GET') {
      const content = await readFile(finalPath);
      response.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store' });
      response.end(content);
      return;
    }
    if (request.method !== 'PUT') return sendJson(response, 405, { error: 'Method not allowed.' });

    return await serializeCatalogMutation(async () => {
    const body = await readBody(request);
    if (!body.length || !body.toString('utf8').includes('\n')) {
      return sendJson(response, 400, { success: false, error: 'A non-empty CSV document is required.' });
    }
    await mkdir(catalogDirectory, { recursive: true });
    temporaryPath = `${finalPath}.${process.pid}.${Date.now()}.upload`;
    await writeFile(temporaryPath, body, { flag: 'w' });

    await backupCatalog(name, temporaryPath);
    await rename(temporaryPath, finalPath);
    return sendJson(response, 200, { success: true, filename, backup: 'complete' });
    });
  } catch (error) {
    if (temporaryPath) await rm(temporaryPath, { force: true }).catch(() => {});
    if (request.method === 'GET' && error.code === 'ENOENT') {
      return sendJson(response, 404, { error: 'Catalog file not found.' });
    }
    console.error(`Catalog ${request.method} failed for ${filename}:`, error);
    return sendJson(response, error.statusCode || 502, { success: false, error: 'Could not read or save the catalog and its Google Drive backup.' });
  }
}

async function handleCatalogSale(request, response) {
  if (!uploadToken || !driveDestination) return sendJson(response, 503, { success: false, error: 'Catalog storage or Google Drive backup is not configured.' });
  if (!authorized(request.headers.authorization)) return sendJson(response, 401, { success: false, error: 'Unauthorized.' });
  return await serializeCatalogMutation(async () => {
    let tempPaintings, tempSold;
    try {
      const input = JSON.parse((await readBody(request, 64 * 1024)).toString('utf8'));
      if (!input?.paymentId || !input?.paintingId) return sendJson(response, 400, { success: false, error: 'Payment and painting IDs are required.' });
      const paintingsPath = path.join(catalogDirectory, 'paintings.csv');
      const soldPath = path.join(catalogDirectory, 'sold.csv');
      const paintingsRows = parseCsv(await readFile(paintingsPath, 'utf8'));
      let soldRows;
      try { soldRows = parseCsv(await readFile(soldPath, 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; soldRows = []; }

      const soldHeader = soldRows[0] || ['invoiceNumber', 'paintingId', 'paintingTitle', 'orderId', 'paymentId', 'amount', 'currency', 'buyerName', 'buyerEmail', 'method', 'paidAt', 'shipAddress', 'shipCity', 'shipState', 'shipPincode', 'shipCountry'];
      const soldColumns = ['invoiceNumber', 'paintingId', 'paintingTitle', 'orderId', 'paymentId', 'amount', 'currency', 'buyerName', 'buyerEmail', 'method', 'paidAt', 'shipAddress', 'shipCity', 'shipState', 'shipPincode', 'shipCountry', 'frameOption', 'baseAmount', 'frameAmount'];
      for (const column of soldColumns) if (!soldHeader.includes(column)) soldHeader.push(column);
      soldRows = [soldHeader, ...soldRows.slice(1).map((row) => {
        while (row.length < soldHeader.length) row.push('');
        return row;
      })];
      const paymentIdx = soldHeader.indexOf('paymentId');
      const existing = soldRows.slice(1).find((row) => row[paymentIdx] === input.paymentId);
      if (existing) return sendJson(response, 200, { success: true, invoiceNumber: existing[soldHeader.indexOf('invoiceNumber')], alreadyProcessed: true });

      const paintingHeader = paintingsRows[0] || [];
      const idIdx = paintingHeader.indexOf('id'), statusIdx = paintingHeader.indexOf('status');
      const paintingRow = paintingsRows.find((row, index) => index > 0 && row[idIdx] === input.paintingId);
      if (!paintingRow) return sendJson(response, 404, { success: false, error: 'Painting not found.' });
      paintingRow[statusIdx] = 'sold';

      const invoiceNumber = `INV-${String(Math.max(0, soldRows.length - 1) + 1).padStart(4, '0')}`;
      const values = { ...input, invoiceNumber };
      soldRows.push(soldHeader.map((column) => String(values[column] ?? '')));
      await mkdir(catalogDirectory, { recursive: true });
      const suffix = `${process.pid}.${Date.now()}`;
      tempPaintings = `${paintingsPath}.${suffix}.upload`;
      tempSold = `${soldPath}.${suffix}.upload`;
      await writeFile(tempPaintings, serializeCsv(paintingsRows));
      await writeFile(tempSold, serializeCsv(soldRows));
      await Promise.all([
        backupCatalog('paintings', tempPaintings),
        backupCatalog('sold', tempSold),
      ]);
      await rename(tempPaintings, paintingsPath); tempPaintings = undefined;
      await rename(tempSold, soldPath); tempSold = undefined;
      return sendJson(response, 200, { success: true, invoiceNumber });
    } catch (error) {
      if (tempPaintings) await rm(tempPaintings, { force: true }).catch(() => {});
      if (tempSold) await rm(tempSold, { force: true }).catch(() => {});
      console.error('Catalog sale commit failed:', error);
      return sendJson(response, 502, { success: false, error: 'Could not commit the sale to Oracle and Google Drive.' });
    }
  });
}

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/healthz') {
    return sendJson(response, 200, { status: 'ok' });
  }
  if (request.method === 'POST' && request.url === '/upload') {
    return void handleUpload(request, response);
  }
  if (request.method === 'POST' && request.url === '/delete') {
    return void handleDelete(request, response);
  }
  const catalogMatch = request.url?.match(/^\/catalog\/(paintings|sold)\.csv$/);
  if (catalogMatch && (request.method === 'GET' || request.method === 'PUT')) {
    return void handleCatalog(request, response, catalogMatch[1]);
  }
  if (request.method === 'POST' && request.url === '/catalog/sale') {
    return void handleCatalogSale(request, response);
  }
  return sendJson(response, 404, { error: 'Not found.' });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`ReenArt image upload service listening on 127.0.0.1:${port}`);
});
