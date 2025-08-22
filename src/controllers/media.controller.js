/* eslint-disable no-console */
import { listObjects, createPresignedPutUrl, getObject , headObject, deleteObject, putObjectStream} from '../services/s3.service.js';
import crypto from 'crypto';
import path from 'path';  

// Allowed content types come from env. Empty list = allow all.
const ALLOWED = (process.env.ALLOWED_CONTENT_TYPES || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Max payload for direct PUT via server (0 = no limit). Bigger files should go presigned.
const MAX = Number(process.env.MAX_UPLOAD_BYTES || 0); 

// validate content-type; build S3 key for "create"
function ensureAllowedContentType(ct) {
  return ALLOWED.length === 0 || ALLOWED.includes(ct);
}
function buildKeyFrom(filename) {
  const ext = (path.extname(filename || '') || '').toLowerCase();
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const id = crypto.randomUUID();
  return `media/${yyyy}/${mm}/${id}${ext}`;
}

// health check
export async function health(_req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, data: { status: 'ok' } }));
}

// list objects
export async function listMedia(_req, res, url) {
  try {
    const prefix = url.searchParams.get('prefix') || 'media/';
    const items = await listObjects(prefix);

    console.log(JSON.stringify({
      action: 'LIST',
      prefix,
      count: items.length,
      status: 'success',
      time: new Date().toISOString()
    }));

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      ok: true,
      data: {
        prefix,
        items: items.map(o => ({
          key: o.Key,
          size: o.Size,
          lastModified: o.LastModified
        }))
      }
    }));
  } catch (e) {
    console.error(JSON.stringify({
      action: 'LIST',
      status: 'error',
      error: e.message,
      time: new Date().toISOString()
    }));

    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: { code: 'INTERNAL', message: 'List failed' } }));
  }
}

// create/update via presigned URL
export async function createPresigned(req, res) {
  let raw = '';
  req.on('data', chunk => (raw += chunk));
  req.on('end', async () => {
    let body;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      console.warn(JSON.stringify({
        action: 'PRESIGN',
        status: 'rejected',
        reason: 'invalid_json',
        time: new Date().toISOString()
      }));
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } }));
    }

    // support both flows: existing key (update) or new filename (create)
    const { key: existingKey, filename, contentType, metadata } = body || {};
    if (!contentType || (!existingKey && !filename)) {
      console.warn(JSON.stringify({
        action: 'PRESIGN',
        status: 'rejected',
        reason: 'missing_contentType_or_key_filename',
        time: new Date().toISOString()
      }));
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'Missing contentType and key/filename' }
      }));
    }
    if (!ensureAllowedContentType(contentType)) {
      console.warn(JSON.stringify({
        action: 'PRESIGN',
        key: existingKey || null,
        status: 'rejected',
        reason: `unsupported type ${contentType}`,
        time: new Date().toISOString()
      }));
      res.statusCode = 415;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        ok: false,
        error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Unsupported Media Type' }
      }));
    }

    const key = existingKey || buildKeyFrom(filename);
    const md = {};
    if (metadata && typeof metadata === 'object') {
      for (const [k, v] of Object.entries(metadata)) {
        if (v != null) md[String(k).toLowerCase()] = String(v);
      }
    }

    try {
      const { url, expiresIn } = await createPresignedPutUrl({
        key,
        contentType,
        metadata: md,
        expiresIn: 900,
      });

      console.log(JSON.stringify({
        action: 'PRESIGN',
        key,
        contentType,
        hasMetadata: Object.keys(md).length > 0,
        expiresIn,
        status: 'success',
        time: new Date().toISOString()
      }));

      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: true, data: { key, url, expiresIn } }));
    } catch (e) {
      console.error(JSON.stringify({
        action: 'PRESIGN',
        key,
        status: 'error',
        error: e.message,
        time: new Date().toISOString()
      }));
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: false, error: { code: 'INTERNAL', message: 'Presign failed' } }));
    }
  });
}

// metadata (HEAD) for a given key
export async function headMedia(_req, res, _url, key) {
  try {
    const info = await headObject(key);

    console.log(JSON.stringify({
      action: 'HEAD',
      key,
      contentType: info.contentType,
      size: info.size,
      status: 'success',
      time: new Date().toISOString()
    }));

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, data: { key, ...info } }));
  } catch (e) {
    console.warn(JSON.stringify({
      action: 'HEAD',
      key,
      status: 'not_found',
      error: e.message,
      time: new Date().toISOString()
    }));
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'File not found' } }));
  }
}

// download file
export async function getMedia(_req, res, _url, key) {
  try {
    const obj = await getObject(key);

    console.log(JSON.stringify({
      action: 'DOWNLOAD',
      key,
      contentType: obj.ContentType || null,
      contentLength: obj.ContentLength || null,
      status: 'success',
      time: new Date().toISOString()
    }));

    res.statusCode = 200;
    res.setHeader('Content-Type', obj.ContentType || 'application/octet-stream');
    if (obj.ContentLength) {
      res.setHeader('Content-Length', obj.ContentLength.toString());
    }
    obj.Body.pipe(res);
  } catch (e) {
    console.error(JSON.stringify({
      action: 'DOWNLOAD',
      key,
      status: 'error',
      error: e.message,
      time: new Date().toISOString()
    }));
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'File not found' } }));
  }
}

// delete a file
export async function deleteMedia(_req, res, _url, key) {
  try {
    await deleteObject(key);

    console.log(JSON.stringify({
      action: 'DELETE',
      key,
      status: 'success',
      time: new Date().toISOString()
    }));

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, data: { deleted: true, key } }));
  } catch (e) {
    console.warn(JSON.stringify({
      action: 'DELETE',
      key,
      status: 'not_found_or_forbidden',
      error: e.message,
      time: new Date().toISOString()
    }));
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'File not found or cannot delete' } }));
  }
}

// update via server (small files)
export async function putMedia(req, res, _url, key) {
  try {
    const ct  = req.headers['content-type'];
    const len = Number(req.headers['content-length'] || 0);

    if (!ct) {
      console.warn(JSON.stringify({
        action: 'UPLOAD',
        key,
        status: 'rejected',
        reason: 'missing content-type',
        time: new Date().toISOString()
      }));
      res.statusCode = 415;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        ok: false,
        error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Missing Content-Type header' }
      }));
    }

    if (!ensureAllowedContentType(ct)) {
      console.warn(JSON.stringify({
        action: 'UPLOAD',
        key,
        status: 'rejected',
        reason: `unsupported type ${ct}`,
        time: new Date().toISOString()
      }));
      res.statusCode = 415;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        ok: false,
        error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: `Unsupported Media Type: ${ct}` }
      }));
    }

    if (MAX > 0 && len > 0 && len > MAX) {
      console.warn(JSON.stringify({
        action: 'UPLOAD',
        key,
        status: 'rejected',
        reason: `too large (${len} > ${MAX})`,
        time: new Date().toISOString()
      }));
      res.statusCode = 413;
      res.setHeader('Content-Type','application/json');
      return res.end(JSON.stringify({
        ok:false,
        error:{ code:'PAYLOAD_TOO_LARGE', message:`Max ${MAX} bytes. Use /media/presign` }
      }));
    }

    const metadata = {};
    for (const [k,v] of Object.entries(req.headers)) {
      if (k.startsWith('x-meta-') && v != null) metadata[k.slice(7).toLowerCase()] = String(v);
    }

    const { etag } = await putObjectStream({ key, body: req, contentType: ct, metadata });

    console.log(JSON.stringify({
      action: 'UPLOAD',
      key,
      size: len || null,
      contentType: ct,
      etag,
      hasMetadata: Object.keys(metadata).length > 0,
      status: 'success',
      time: new Date().toISOString()
    }));

    res.statusCode = 200;
    res.setHeader('Content-Type','application/json');
    return res.end(JSON.stringify({ ok:true, data:{ replaced:true, key, etag } }));
  } catch (e) {
    console.error(JSON.stringify({
      action: 'UPLOAD',
      key,
      status: 'error',
      error: e.message,
      time: new Date().toISOString()
    }));
    res.statusCode = 500;
    res.setHeader('Content-Type','application/json');
    return res.end(JSON.stringify({ ok:false, error:{ code:'INTERNAL', message:'Upload (PUT) failed' }}));
  }
}