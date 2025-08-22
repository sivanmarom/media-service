import { listObjects } from '../services/s3.service.js';

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
   
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: { code: 'INTERNAL', message: 'List failed' } }));
  }
}
export async function createPresigned(_req, res) {
  res.statusCode = 201;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, data: { url: '<stub>', key: '<stub>' } }));
}

export async function headMedia(_req, res, _url, key) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, data: { key, metadata: {}, note: 'head controller stub' } }));
}

export async function getMedia(_req, res, _url, key) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, data: { key, note: 'get controller stub' } }));
}

export async function deleteMedia(_req, res, _url, key) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, data: { deleted: true, key, note: 'delete controller stub' } }));
}