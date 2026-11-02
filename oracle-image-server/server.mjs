import { createServer } from 'node:http';
import { mkdir, rename, rm, unlink, writeFile } from 'node:fs/promises';
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
    await execFileAsync('rclone', ['copyto', finalPath, target, '--no-traverse'], { timeout: 120_000 });
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
  return sendJson(response, 404, { error: 'Not found.' });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`ReenArt image upload service listening on 127.0.0.1:${port}`);
});
