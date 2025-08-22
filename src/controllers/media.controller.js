import { listObjects, createPresignedPutUrl, getObject , headObject, deleteObject, putObjectStream} from '../services/s3.service.js';
import crypto from 'crypto';
import path from 'path';  

const ALLOWED = (process.env.ALLOWED_CONTENT_TYPES || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const MAX = Number(process.env.MAX_UPLOAD_BYTES || 0); 

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

export async function health(_req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, data: { status: 'ok' } }));
}

export async function listMedia(_req, res, url) {
  try {
    const prefix = url.searchParams.get('prefix') || 'media/';
    const items = await listObjects(prefix);
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
  console.error('LIST ERROR:', {
    name: e?.name,
    message: e?.message,
    code: e?.Code || e?.code,
    status: e?.$metadata?.httpStatusCode,
    cfId: e?.$metadata?.cfId,
    requestId: e?.$metadata?.requestId,
    extendedRequestId: e?.$metadata?.extendedRequestId
  });

  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: false, error: { code: 'INTERNAL', message: 'List failed' } }));
}
}
export async function createPresigned(req, res) {
  let raw = '';
  req.on('data', chunk => (raw += chunk));
  req.on('end', async () => {
    let body;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } }));
    }

const { key: existingKey, filename, contentType, metadata } = body || {};
if (!contentType || (!existingKey && !filename)) {
  res.statusCode = 400;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({
    ok: false,
    error: { code: 'BAD_REQUEST', message: 'Missing contentType and key/filename' }
  }));
}
if (!ensureAllowedContentType(contentType)) {
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
      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: true, data: { key, url, expiresIn } }));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: false, error: { code: 'INTERNAL', message: 'Presign failed' } }));
    }
  });
}

export async function headMedia(_req, res, _url, key) {
  try {
    const info = await headObject(key);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, data: { key, ...info } }));
  } catch (e) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'File not found' } }));
  }
}

export async function getMedia(_req, res, _url, key) {
  try {
    const obj = await getObject(key);

    res.statusCode = 200;
    res.setHeader('Content-Type', obj.ContentType || 'application/octet-stream');
    if (obj.ContentLength) {
      res.setHeader('Content-Length', obj.ContentLength.toString());
    }

    obj.Body.pipe(res);
  } catch (e) {
    console.error('GET ERROR:', e);
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'File not found' } }));
  }
}
export async function deleteMedia(_req, res, _url, key) {
  try {
    await deleteObject(key);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, data: { deleted: true, key } }));
  } catch (e) {
 
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'File not found or cannot delete' } }));
  }
}



export async function putMedia(req, res, _url, key) {
  try {
    const ct = req.headers['content-type'];
    const len = Number(req.headers['content-length'] || 0);


    if (MAX > 0 && len > 0 && len > MAX) {
      res.statusCode = 413;
      res.setHeader('Content-Type','application/json');
      return res.end(JSON.stringify({ ok:false, error:{ code:'PAYLOAD_TOO_LARGE', message:`Max ${MAX} bytes. Use /media/presign` }}));
    }

    const metadata = {};
    for (const [k,v] of Object.entries(req.headers)) {
      if (k.startsWith('x-meta-') && v != null) metadata[k.slice(7).toLowerCase()] = String(v);
    }

    const { etag } = await putObjectStream({ key, body: req, contentType: ct, metadata });
    res.statusCode = 200;
    res.setHeader('Content-Type','application/json');
    return res.end(JSON.stringify({ ok:true, data:{ replaced:true, key, etag } }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type','application/json');
    return res.end(JSON.stringify({ ok:false, error:{ code:'INTERNAL', message:'Upload (PUT) failed' }}));
  }
}